import argparse
import csv
import json
import shutil
import statistics
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run JMeter safely for the performance hub.")
    parser.add_argument("--jmx", required=True, help="Absolute path to the uploaded JMX file")
    parser.add_argument("--threads", required=True, type=int, help="Number of virtual users")
    parser.add_argument("--ramp-up", required=True, dest="ramp_up", type=int, help="Ramp-up seconds")
    parser.add_argument("--loops", required=True, type=int, help="Loop count")
    parser.add_argument("--results", required=True, help="Absolute path to the JTL results file")
    parser.add_argument(
        "--jmeter-path",
        required=False,
        dest="jmeter_path",
        help="Optional full path to the JMeter executable",
    )
    return parser.parse_args()


def percentile(values: list[int], percent: int) -> int:
    if not values:
        return 0

    index = max(0, min(len(values) - 1, int((percent / 100) * len(values) + 0.9999) - 1))
    return values[index]


def build_summary(result_path: Path) -> dict | None:
    if not result_path.exists():
        return None

    rows: list[dict[str, str]] = []
    with result_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)

    if not rows:
        return None

    elapsed_values = sorted(
        int(row["elapsed"])
        for row in rows
        if row.get("elapsed") not in (None, "") and str(row["elapsed"]).isdigit()
    )
    if not elapsed_values:
        return None

    failures = sum(1 for row in rows if str(row.get("success", "")).lower() != "true")
    timestamps = [
        int(row["timeStamp"])
        for row in rows
        if row.get("timeStamp") not in (None, "") and str(row["timeStamp"]).isdigit()
    ]
    throughput = None
    if len(timestamps) > 1:
        duration_ms = max(timestamps) - min(timestamps)
        if duration_ms > 0:
            throughput = round(len(rows) / (duration_ms / 1000), 2)

    return {
        "samples": len(rows),
        "failures": failures,
        "errorRate": round((failures / len(rows)) * 100, 2),
        "averageMs": round(statistics.fmean(elapsed_values)),
        "p90Ms": percentile(elapsed_values, 90),
        "p95Ms": percentile(elapsed_values, 95),
        "p99Ms": percentile(elapsed_values, 99),
        "throughput": throughput,
    }


def validate_jmeter_path(raw_path: str) -> str | None:
    candidate = Path(raw_path).expanduser()
    if not candidate.exists() or not candidate.is_file():
        return None

    allowed_names = {"jmeter", "jmeter.bat", "jmeter.cmd", "jmeter.exe"}
    if candidate.name.lower() not in allowed_names:
        return None

    return str(candidate)


def find_jmeter(explicit_path: str | None = None) -> str | None:
    if explicit_path:
        validated = validate_jmeter_path(explicit_path)
        if validated:
            return validated
        return None

    candidates = ["jmeter"]
    if sys.platform.startswith("win"):
        candidates = ["jmeter.bat", "jmeter.cmd", "jmeter.exe", "jmeter"]

    for candidate in candidates:
        located = shutil.which(candidate)
        if located:
            return located

    return None


def main() -> int:
    args = parse_args()
    jmx_path = Path(args.jmx)
    result_path = Path(args.results)

    if jmx_path.suffix.lower() != ".jmx":
        print(json.dumps({"status": "failed", "message": "Only .jmx files are accepted."}))
        return 1

    if not jmx_path.exists():
        print(json.dumps({"status": "failed", "message": "Uploaded JMX file could not be found."}))
        return 1

    if args.threads < 1 or args.ramp_up < 1 or args.loops < 1:
        print(
            json.dumps(
                {
                    "status": "failed",
                    "message": "Threads, ramp-up, and loop count must all be positive integers.",
                }
            )
        )
        return 1

    jmeter_executable = find_jmeter(args.jmeter_path)
    if not jmeter_executable:
        setup_message = "JMeter is not available on PATH. Install Apache JMeter before running performance tests."
        if args.jmeter_path:
            setup_message = (
                "The provided JMeter path is invalid. Use the full path to jmeter.bat, "
                "jmeter.cmd, jmeter.exe, or jmeter, or leave the field blank to use PATH."
            )
        print(
            json.dumps(
                {
                    "status": "setup_required",
                    "message": setup_message,
                }
            )
        )
        return 0

    command = [
        jmeter_executable,
        "-n",
        "-t",
        str(jmx_path),
        f"-Jthreads={args.threads}",
        f"-Jramp={args.ramp_up}",
        f"-Jloops={args.loops}",
        "-Jjmeter.save.saveservice.output_format=csv",
        "-l",
        str(result_path),
    ]

    completed = subprocess.run(
        command,
        shell=False,
        capture_output=True,
        text=True,
        check=False,
    )

    payload: dict = {
        "status": "completed" if completed.returncode == 0 else "failed",
        "message": (
            "JMeter execution completed."
            if completed.returncode == 0
            else "JMeter exited with an error."
        ),
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
        "command": command,
        "resultPath": str(result_path),
    }

    summary = build_summary(result_path)
    if summary is not None:
        payload["summary"] = summary

    print(json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
