"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/shared/components/layout/Shell";
import { RequireAuth } from "@/shared/components/RequireAuth";
import { projects } from "@/shared/lib/mock-data";
import {
  listUserProjects,
  updateUserProfile,
  useAuth,
  useEventTick,
  type ProfileUpdate,
} from "@/shared/state";
import {
  Activity,
  Briefcase,
  Calendar,
  Camera,
  FolderKanban,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  UserRound,
  X,
} from "lucide-react";

type ProfileForm = Required<Omit<ProfileUpdate, "profilePicture">> & {
  profilePicture: string;
};

const emptyForm: ProfileForm = {
  fullName: "",
  username: "",
  phone: "",
  website: "",
  address: "",
  birthdate: "",
  about: "",
  skills: "",
  profilePicture: "",
};

function ProfilePage() {
  useEventTick("qe-hub.user-projects-changed");
  const user = useAuth();
  const userProjects = listUserProjects();
  const allProjects = [...projects, ...userProjects];
  const totalRuns = projects.reduce((acc, p) => acc + p.runs.length, 0);
  const totalPosts = projects.reduce((acc, p) => acc + p.discussions.length, 0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.fullName,
      username: user.username,
      phone: user.phone ?? "",
      website: user.website ?? "",
      address: user.address ?? "",
      birthdate: user.birthdate ?? "",
      about: user.about ?? "",
      skills: user.skills ?? "",
      profilePicture: user.profilePicture ?? "",
    });
  }, [user]);

  const skillList = useMemo(
    () =>
      form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    [form.skills],
  );

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function pickImage(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateField("profilePicture", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    if (!user) return;
    const result = await updateUserProfile(user.id, form).catch(() => null);
    if (!result) {
      setMessage("Unable to update profile.");
      return;
    }
    if (!result.ok) {
      setMessage(
        result.reason === "username-taken"
          ? "Username already exists."
          : "Unable to update profile.",
      );
      return;
    }
    setEditing(false);
    setMessage("Profile updated.");
  }

  function cancelEdit() {
    if (!user) return;
    setForm({
      fullName: user.fullName,
      username: user.username,
      phone: user.phone ?? "",
      website: user.website ?? "",
      address: user.address ?? "",
      birthdate: user.birthdate ?? "",
      about: user.about ?? "",
      skills: user.skills ?? "",
      profilePicture: user.profilePicture ?? "",
    });
    setEditing(false);
    setMessage("");
  }

  const initials = (form.fullName || form.username || "User")
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <RequireAuth>
      <Shell>
        <div className="rounded-3xl glass-strong p-7 mb-5 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-violet-300 to-sky-400 opacity-30 blur-3xl" />
          <div className="relative flex flex-wrap items-start gap-5">
            <label className={editing ? "relative cursor-pointer" : "relative"}>
              {form.profilePicture ? (
                <img
                  src={form.profilePicture}
                  alt=""
                  className="h-24 w-24 rounded-3xl object-cover shadow-lg"
                />
              ) : (
                <div className="h-24 w-24 rounded-3xl bg-[image:var(--gradient-primary)] grid place-items-center text-white text-3xl font-bold shadow-lg">
                  {initials}
                </div>
              )}
              {editing && (
                <>
                  <span className="absolute inset-0 rounded-3xl bg-black/35 grid place-items-center text-white">
                    <Camera className="h-5 w-5" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => pickImage(event.target.files?.[0])}
                  />
                </>
              )}
            </label>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-[220px]">
                  <h1 className="text-3xl font-bold">{form.fullName || "Profile"}</h1>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground font-semibold capitalize">
                      {user?.role ?? "user"}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-medium">
                      {user?.status ?? "active"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {message && <span className="text-xs text-muted-foreground">{message}</span>}
                  {editing ? (
                    <>
                      <button
                        onClick={saveProfile}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        <Save className="h-3.5 w-3.5" /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setEditing(true);
                        setMessage("");
                      }}
                      className="rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
                    >
                      Edit profile
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                {form.about || "Add a short profile summary so the team knows what you work on."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {user?.email}
                </span>
                {form.phone && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {form.phone}
                  </span>
                )}
                {form.website && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Globe className="h-4 w-4" /> {form.website}
                  </span>
                )}
                {form.address && (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {form.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 mb-4">
          <Stat label="Projects joined" value={allProjects.length} />
          <Stat label="Tests run" value={totalRuns} />
          <Stat label="Forum posts" value={totalPosts} />
          <Stat label="Personal projects" value={userProjects.length} />
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="rounded-3xl glass p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" /> Profile details
              </h2>
              {form.birthdate && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {form.birthdate}
                </span>
              )}
            </div>

            {editing ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field
                  label="Full name"
                  value={form.fullName}
                  onChange={(value) => updateField("fullName", value)}
                />
                <Field
                  label="Username"
                  value={form.username}
                  onChange={(value) => updateField("username", value)}
                />
                <Field
                  label="Birthdate"
                  type="date"
                  value={form.birthdate}
                  onChange={(value) => updateField("birthdate", value)}
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChange={(value) => updateField("phone", value)}
                />
                <Field
                  label="Website"
                  value={form.website}
                  onChange={(value) => updateField("website", value)}
                />
                <Field
                  label="Address"
                  value={form.address}
                  onChange={(value) => updateField("address", value)}
                />
                <TextField
                  label="About"
                  value={form.about}
                  onChange={(value) => updateField("about", value)}
                />
                <TextField
                  label="Skills"
                  value={form.skills}
                  onChange={(value) => updateField("skills", value)}
                />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <Detail label="Username" value={`@${form.username}`} />
                <Detail label="Phone" value={form.phone || "Not set"} />
                <Detail label="Website" value={form.website || "Not set"} />
                <Detail label="Birthdate" value={form.birthdate || "Not set"} />
                <Detail label="Address" value={form.address || "Not set"} wide />
                <Detail label="About" value={form.about || "Not set"} wide />
              </div>
            )}
          </div>

          <div className="rounded-3xl glass p-6">
            <h2 className="font-semibold mb-4 inline-flex items-center gap-2">
              <Activity className="h-4 w-4" /> Skills & workspace
            </h2>
            <div className="flex flex-wrap gap-2 mb-5">
              {skillList.length > 0 ? (
                skillList.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-white/70 border border-white/70 px-3 py-1 text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No skills added yet.</span>
              )}
            </div>
            <div className="space-y-2">
              {allProjects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-2xl bg-white/60 border border-white/70 p-3 flex items-center gap-3 hover:bg-white transition"
                >
                  <div
                    className={`h-10 w-10 rounded-xl bg-gradient-to-br ${project.color} grid place-items-center text-white text-xs font-bold`}
                  >
                    {project.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{project.type}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    </RequireAuth>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="auth-input"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm sm:col-span-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="auth-input min-h-24 resize-none"
      />
    </label>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 rounded-2xl bg-white/60 border border-white/70 px-3 py-2 min-h-10">
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl glass p-5">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default ProfilePage;
