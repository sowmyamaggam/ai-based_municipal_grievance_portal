"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Crosshair, FileText, ImagePlus, LoaderCircle, MapPin, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UploadedFile = {
  url: string;
  filename: string;
  mimeType: "image/jpeg" | "image/png" | "application/pdf";
  size: number;
};

type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export function NewComplaintForm() {
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationName, setLocationName] = useState("");
  const [placeNameError, setPlaceNameError] = useState("");
  const [findingPlaceName, setFindingPlaceName] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ number: string; duplicate: boolean } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en" | "te">("en");
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  async function lookUpPlaceName(captured: CapturedLocation) {
    setFindingPlaceName(true);
    setPlaceNameError("");
    try {
      const response = await fetch(`/api/location/reverse?latitude=${encodeURIComponent(captured.latitude)}&longitude=${encodeURIComponent(captured.longitude)}`);
      const payload = await response.json();
      if (!response.ok || typeof payload.locationName !== "string") {
        setPlaceNameError(payload.error || "A place name could not be found. Enter a landmark above instead.");
        return;
      }
      // The API allows 500 characters for display, while complaint addresses
      // intentionally cap at 300. Keep the generated value valid for submit.
      const placeName = payload.locationName.slice(0, 300);
      setLocationName(placeName);
      setAddress((current) => current.trim() || placeName);
    } catch {
      // GPS is already captured. A failed place-name lookup must never prevent
      // the report from being submitted.
      setPlaceNameError("A place name could not be found. Enter a landmark above instead.");
    } finally {
      setFindingPlaceName(false);
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location capture. Enter a location name or landmark instead.");
      return;
    }

    setCapturing(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const captured = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        };
        setLocation(captured);
        setLocationName("");
        setPlaceNameError("");
        setCapturing(false);
        void lookUpPlaceName(captured);
      },
      (locationError) => {
        setError(
          locationError.code === 1
            ? "Location permission was declined. You can still submit using a place name or landmark."
            : "We could not get your location. You can try again or enter a place name manually."
        );
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 }
    );
  }

  async function upload(selected: FileList | null) {
    if (!selected?.length) return;
    setError("");
    if (files.length + selected.length > 6) {
      setError("You can attach up to six files.");
      return;
    }

    setUploading(true);
    try {
      const newlyUploaded = await Promise.all(
        Array.from(selected).map(async (file) => {
          const data = new FormData();
          data.append("file", file);
          const response = await fetch("/api/uploads", { method: "POST", body: data });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || `Could not upload ${file.name}`);
          return payload as UploadedFile;
        })
      );
      setFiles((current) => [...current, ...newlyUploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess(null);
    if (description.trim().length < 20) {
      setError("Please describe the issue in at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          address: address.trim() || locationName || undefined,
          attachments: files,
          location,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to submit report");

      setSuccess({ number: payload.complaint.complaintNumber, duplicate: Boolean(payload.complaint.duplicate?.possible) });
      setDescription("");
      setAddress("");
      setLocation(null);
      setLocationName("");
      setPlaceNameError("");
      setFiles([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.language = voiceLanguage === "en" ? "en-US" : "te-IN";

      recognition.onstart = () => {
        setIsRecording(true);
        setError("");
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            setDescription((prev) => (prev + " " + event.results[i][0].transcript).trim());
          }
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Voice input error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-7 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-7">
        <Card className="p-5 sm:p-7">
          <h2 className="text-lg font-extrabold text-ink">Describe the issue</h2>
          <p className="mt-1 text-sm text-slate-500">Include what happened, the exact landmark, and any safety risk.</p>
          
          {/* Voice Input Controls */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Use voice:</label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="en"
                checked={voiceLanguage === "en"}
                onChange={(e) => setVoiceLanguage(e.target.value as "en" | "te")}
                disabled={isRecording}
              />
              <span className="text-sm">English</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="te"
                checked={voiceLanguage === "te"}
                onChange={(e) => setVoiceLanguage(e.target.value as "en" | "te")}
                disabled={isRecording}
              />
              <span className="text-sm">Telugu</span>
            </label>
            <Button
              type="button"
              variant="outline"
              className="gap-2 px-3 py-1 text-xs"
              onClick={startVoiceInput}
              disabled={voiceProcessing}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Start Recording
                </>
              )}
            </Button>
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            What needs attention?
            <Textarea
              className="mt-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={4000}
              placeholder="For example: A large pothole outside the college gate is causing bikes to swerve into traffic…"
              required
            />
          </label>
          <p className="mt-1 text-right text-xs text-slate-400">{description.length}/4000</p>
          <label className="mt-5 block text-sm font-bold text-slate-700">
            Location name or landmark <span className="font-normal text-slate-400">(optional but helpful)</span>
            <Input
              className="mt-2"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={300}
              placeholder="e.g. Near municipal school, Ward 12"
            />
          </label>
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-ink">Add supporting files</h2>
              <p className="mt-1 text-sm text-slate-500">JPG, PNG, or PDF · up to 10 MB each · 6 files maximum</p>
            </div>
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <LoaderCircle className="animate-spin" size={17} /> : <ImagePlus size={17} />}
              {uploading ? "Uploading…" : "Choose files"}
            </Button>
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              onChange={(event) => void upload(event.target.files)}
            />
          </div>

          {files.length ? (
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {files.map((file, index) => (
                <li key={`${file.url}-${index}`} className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-civic-700">
                    {file.mimeType === "application/pdf" ? <FileText size={18} /> : <ImagePlus size={18} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{file.filename}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-red-600"
                    aria-label={`Remove ${file.filename}`}
                  >
                    <X size={17} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 grid w-full place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:border-civic-400 hover:bg-civic-50"
            >
              <ImagePlus className="mb-2 text-civic-600" />
              <span className="text-sm font-bold text-slate-700">Photos make it easier to assess the issue</span>
              <span className="mt-1 text-xs text-slate-500">Click to browse files</span>
            </button>
          )}
        </Card>
      </div>

      <div className="space-y-7">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700"><MapPin size={20} /></span>
            <div>
              <h2 className="font-extrabold text-ink">Location</h2>
              <p className="text-sm text-slate-500">Optional, but helps us find the issue.</p>
            </div>
          </div>
          <Button type="button" variant="secondary" className="mt-5 w-full" onClick={captureLocation} disabled={capturing}>
            {capturing ? <LoaderCircle className="animate-spin" size={17} /> : <Crosshair size={17} />}
            {capturing ? "Getting location…" : location ? "Update current location" : "Use my current location"}
          </Button>
          <p className="mt-3 text-xs leading-5 text-slate-500">We only use GPS after you choose this action, then look up a readable place name. You can submit without it.</p>

          {location && (
            <div className="mt-5 rounded-xl bg-civic-50 p-3 text-sm text-civic-900" aria-live="polite">
              <p className="font-bold">{findingPlaceName ? "Finding the place name…" : "GPS location captured"}</p>
              <p className="mt-1 leading-5">{locationName || "Use the location name field to add a landmark if a place name is not available."}</p>
              {placeNameError && <p className="mt-2 text-xs font-medium text-amber-800">{placeNameError}</p>}
              {location.accuracy !== undefined && <p className="mt-2 text-xs font-medium text-civic-700">GPS accuracy: approximately {location.accuracy} m</p>}
              <p className="mt-2 text-xs text-civic-700">Coordinates are stored privately for authorized maps and related-report checks.</p>
            </div>
          )}
        </Card>

        <Card className="border-civic-100 bg-civic-50 p-5">
          <h2 className="font-extrabold text-civic-800">What happens next?</h2>
          <ol className="mt-3 space-y-2 text-sm leading-5 text-civic-900">
            <li>1. Your report is safely saved.</li>
            <li>2. AI helps classify and route it in the background.</li>
            <li>3. Nearby related reports are flagged for review.</li>
            <li>4. You receive status updates.</li>
          </ol>
        </Card>
      </div>

      {error && (
        <div className="xl:col-span-2">
          <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            <AlertCircle className="shrink-0" size={18} />
            {error}
          </p>
        </div>
      )}
      {success && (
        <div className="xl:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="shrink-0 text-emerald-600" />
            <div>
              <h2 className="font-extrabold text-emerald-900">Report {success.number} submitted</h2>
              <p className="mt-1 text-sm text-emerald-800">Your report is saved. AI analysis and related-report checks continue in the background.{success.duplicate ? " A possibly related report was also found for municipal review." : ""}</p>
            </div>
          </div>
        </div>
      )}
      <div className="xl:col-span-2">
        <Button type="submit" className="w-full sm:w-auto" disabled={submitting || uploading}>
          {submitting ? <><LoaderCircle className="animate-spin" size={18} />Submitting safely…</> : "Submit report"}
        </Button>
      </div>
    </form>
  );
}
