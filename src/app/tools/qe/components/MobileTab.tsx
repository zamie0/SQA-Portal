import { useMemo, useRef, useState } from "react";
import type { Project } from "@/shared/lib/mock-data";
import {
  Smartphone,
  Upload,
  Plus,
  Apple,
  Play,
  Trash2,
  Settings2,
  FileCode2,
  X,
} from "lucide-react";
import {
  addApk,
  addDevice,
  addRobotScript,
  getState,
  removeApk,
  removeDevice,
  startRun,
  AUTOMATION_EVENT,
  type DeviceConfig,
} from "@/shared/lib/automation-runs";
import { useEventTick } from "@/shared/lib/use-storage";
import { RunResultsPanel } from "./RunResultsPanel";
import { MiniFilesPanel } from "./MiniFilesPanel";

export function MobileTab({ project }: { project: Project }) {
  useEventTick(AUTOMATION_EVENT);
  const state = getState(project.id);
  const apkInputRef = useRef<HTMLInputElement>(null);
  const robotInputRef = useRef<HTMLInputElement>(null);

  const [selApk, setSelApk] = useState<string>("");
  const [selScript, setSelScript] = useState<string>("");
  const [selDevice, setSelDevice] = useState<string>(state.devices[0]?.id ?? "");
  const [showDeviceForm, setShowDeviceForm] = useState(false);

  const latestRun = useMemo(() => state.runs[0], [state.runs]);

  function onApkPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const platform: "Android" | "iOS" = file.name.toLowerCase().endsWith(".ipa")
      ? "iOS"
      : "Android";
    const apk = addApk(project.id, file, platform);
    setSelApk(apk.id);
    e.target.value = "";
  }

  async function onRobotPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = await addRobotScript(project.id, file);
    setSelScript(s.id);
    e.target.value = "";
  }

  function handleRun() {
    const device = selDevice || state.devices[0]?.id;
    startRun(project.id, { apkId: selApk, scriptId: selScript, deviceId: device });
  }

  const canRun = !!selApk && !!selDevice;

  return (
    <div className="space-y-4">
      {/* Run console */}
      <div className="rounded-3xl glass-strong p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-lg">Mobile automation runner</h3>
            <p className="text-xs text-muted-foreground">
              Upload APK / IPA + Robot Framework script · run on Appium · view results
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={!canRun}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[image:var(--gradient-primary)] text-white text-sm font-semibold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4 fill-white" /> Run on device
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <PickerCard
            label="App build (.apk / .ipa)"
            value={selApk}
            onChange={setSelApk}
            options={state.apks.map((a) => ({ id: a.id, label: `${a.name} · ${a.size}` }))}
            empty="No builds yet"
            action={
              <button
                onClick={() => apkInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-foreground text-background text-[11px] font-medium"
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
            }
          />
          <PickerCard
            label="Robot script (.robot)"
            value={selScript}
            onChange={setSelScript}
            options={state.scripts.map((s) => ({ id: s.id, label: `${s.name} · ${s.size}` }))}
            empty="No scripts yet"
            action={
              <button
                onClick={() => robotInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-foreground text-background text-[11px] font-medium"
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
            }
          />
          <PickerCard
            label="Device / emulator"
            value={selDevice}
            onChange={setSelDevice}
            options={state.devices.map((d) => ({
              id: d.id,
              label: `${d.name} · ${d.platform} ${d.platformVersion}`,
            }))}
            empty="No devices configured"
            action={
              <button
                onClick={() => setShowDeviceForm(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass text-[11px] font-medium"
              >
                <Plus className="h-3 w-3" /> New
              </button>
            }
          />
        </div>

        <input
          ref={apkInputRef}
          type="file"
          accept=".apk,.ipa"
          className="hidden"
          onChange={onApkPicked}
        />
        <input
          ref={robotInputRef}
          type="file"
          accept=".robot,.txt"
          className="hidden"
          onChange={onRobotPicked}
        />
      </div>

      {/* Latest results */}
      {latestRun ? (
        <RunResultsPanel projectId={project.id} runId={latestRun.id} />
      ) : (
        <div className="rounded-3xl glass p-8 text-center text-sm text-muted-foreground">
          No runs yet. Upload an APK and a .robot file, pick a device, then click{" "}
          <b>Run on device</b>.
        </div>
      )}

      {/* Asset library */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl glass p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> App builds
          </h3>
          {state.apks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No APK / IPA uploaded.</p>
          )}
          <div className="space-y-2">
            {state.apks.map((b) => {
              const Icon = b.platform === "iOS" ? Apple : Smartphone;
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70"
                >
                  <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.platform} · {b.size} · {new Date(b.uploaded).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => removeApk(project.id, b.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl glass p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Devices
            </h3>
            <button
              onClick={() => setShowDeviceForm(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-foreground text-background text-[11px] font-medium"
            >
              <Plus className="h-3 w-3" /> Add device
            </button>
          </div>
          <div className="space-y-2">
            {state.devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white/70"
              >
                <div className="h-10 w-10 rounded-xl bg-white/80 border border-white/70 grid place-items-center">
                  {d.platform === "iOS" ? (
                    <Apple className="h-4 w-4" />
                  ) : (
                    <Smartphone className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {d.deviceName} · {d.automationName} · v{d.platformVersion}
                  </div>
                </div>
                <button
                  onClick={() => removeDevice(project.id, d.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-3xl glass p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <FileCode2 className="h-4 w-4" /> Robot scripts available
          </h3>
          {state.scripts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No .robot files uploaded.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-2">
              {state.scripts.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-white/60 border border-white/70">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.size} · {new Date(s.uploaded).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MiniFilesPanel
        projectId={project.id}
        title="Project files"
        accept=".apk,.ipa,.robot,.py,.js,.ts,.json,.yaml,.yml"
      />

      {showDeviceForm && (
        <DeviceModal
          onClose={() => setShowDeviceForm(false)}
          onSave={(d) => {
            const dev = addDevice(project.id, d);
            setSelDevice(dev.id);
            setShowDeviceForm(false);
          }}
        />
      )}
    </div>
  );
}

function PickerCard({
  label,
  value,
  onChange,
  options,
  empty,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  empty: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/60 border border-white/70 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {action}
      </div>
      {options.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-1.5">{empty}</div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm bg-white/70 border border-white/70 rounded-lg px-2 py-1.5"
        >
          <option value="">— select —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function DeviceModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Omit<DeviceConfig, "id">) => void;
}) {
  const [name, setName] = useState("Pixel 8 Emulator");
  const [platform, setPlatform] = useState<"Android" | "iOS">("Android");
  const [deviceName, setDeviceName] = useState("emulator-5554");
  const [platformVersion, setPlatformVersion] = useState("14");
  const [automationName, setAutomationName] = useState("UiAutomator2");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl glass-strong p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/60"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="font-semibold text-lg mb-4">New device config</h3>
        <div className="space-y-3 text-sm">
          <Field label="Display name" value={name} onChange={setName} />
          <div>
            <label className="text-xs font-medium text-muted-foreground">Platform</label>
            <select
              value={platform}
              onChange={(e) => {
                const p = e.target.value as "Android" | "iOS";
                setPlatform(p);
                setAutomationName(p === "iOS" ? "XCUITest" : "UiAutomator2");
              }}
              className="w-full mt-1 bg-white/70 border border-white/70 rounded-lg px-2 py-1.5"
            >
              <option>Android</option>
              <option>iOS</option>
            </select>
          </div>
          <Field
            label="Device name (UDID / emulator id)"
            value={deviceName}
            onChange={setDeviceName}
            mono
          />
          <Field label="Platform version" value={platformVersion} onChange={setPlatformVersion} />
          <Field
            label="Automation driver"
            value={automationName}
            onChange={setAutomationName}
            mono
          />
        </div>
        <button
          onClick={() => onSave({ name, platform, deviceName, platformVersion, automationName })}
          className="mt-5 w-full px-4 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white text-sm font-semibold shadow"
        >
          Save device
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full mt-1 bg-white/70 border border-white/70 rounded-lg px-2 py-1.5 ${mono ? "font-mono text-xs" : ""}`}
      />
    </div>
  );
}
