"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Send, Copy, Check } from "lucide-react";

interface VoiceComplaintData {
  transcript: string;
  category?: string;
  priority?: string;
  description?: string;
}

interface ExtractedInfo {
  description: string;
  category: string;
  priority: string;
  locationDescription?: string;
}

export function VoiceComplaintForm() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const [language, setLanguage] = useState<"en" | "te">("en");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.language = language === "en" ? "en-US" : "te-IN";

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + transcriptSegment + " ");
        } else {
          interimTranscript += transcriptSegment;
        }
      }
    };

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstart = () => {
        setTranscript("");
        setError(null);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to access microphone"
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setTranscript("");
    setExtractedInfo(null);
    setError(null);
    audioChunksRef.current = [];
  };

  const extractComplaintInfo = async () => {
    if (!transcript.trim()) {
      setError("Please record a voice complaint first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/complaints/voice-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process voice complaint");
      }

      const data = await response.json();
      setExtractedInfo(data.analysis);
      setShowConfirmation(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze voice complaint"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const submitComplaint = async () => {
    if (!extractedInfo) {
      setError("No complaint information to submit");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: extractedInfo.description,
          address: extractedInfo.locationDescription,
          category: extractedInfo.category,
          attachments: [],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit complaint");
      }

      const data = await response.json();
      setSuccess(`Complaint registered successfully! ID: ${data.complaint.complaintNumber}`);
      resetRecording();
      setShowConfirmation(false);

      // Reset form after success
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit complaint"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="en"
            checked={language === "en"}
            onChange={(e) => setLanguage(e.target.value as "en" | "te")}
            disabled={isRecording}
          />
          <span className="text-sm font-medium">English</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            value="te"
            checked={language === "te"}
            onChange={(e) => setLanguage(e.target.value as "en" | "te")}
            disabled={isRecording}
          />
          <span className="text-sm font-medium">Telugu</span>
        </label>
      </div>

      {/* Recording Controls */}
      <div className="flex gap-3">
        <button
          onClick={startRecording}
          disabled={isRecording || isProcessing}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
        >
          <Mic className="h-5 w-5" />
          {isRecording ? "Recording..." : "Start Recording"}
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-2 text-white hover:bg-gray-700 disabled:bg-gray-400"
        >
          <MicOff className="h-5 w-5" />
          Stop Recording
        </button>

        <button
          onClick={resetRecording}
          disabled={isRecording || !transcript}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:bg-gray-100"
        >
          <RotateCcw className="h-5 w-5" />
          Reset
        </button>
      </div>

      {/* Transcript Display */}
      {transcript && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Transcript</h3>
          <p className="text-blue-800">{transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Extract Button */}
      {transcript && !extractedInfo && (
        <button
          onClick={extractComplaintInfo}
          disabled={isProcessing}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isProcessing ? "Processing..." : "Extract Information"}
        </button>
      )}

      {/* Extracted Information Preview */}
      {extractedInfo && (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="mb-3 font-semibold text-green-900">
              Extracted Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  value={extractedInfo.category}
                  onChange={(e) =>
                    setExtractedInfo({
                      ...extractedInfo,
                      category: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  value={extractedInfo.priority}
                  onChange={(e) =>
                    setExtractedInfo({
                      ...extractedInfo,
                      priority: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option>LOW</option>
                  <option>MEDIUM</option>
                  <option>HIGH</option>
                  <option>CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={extractedInfo.description}
                  onChange={(e) =>
                    setExtractedInfo({
                      ...extractedInfo,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location Description (Optional)
                </label>
                <input
                  type="text"
                  value={extractedInfo.locationDescription || ""}
                  onChange={(e) =>
                    setExtractedInfo({
                      ...extractedInfo,
                      locationDescription: e.target.value,
                    })
                  }
                  placeholder="e.g., Near Main Street Market"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Confirmation Buttons */}
          <div className="flex gap-3">
            <button
              onClick={submitComplaint}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
            >
              <Send className="h-5 w-5" />
              {isProcessing ? "Submitting..." : "Submit Complaint"}
            </button>

            <button
              onClick={() => {
                setExtractedInfo(null);
                setShowConfirmation(false);
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 hover:bg-gray-50"
            >
              Edit Transcript
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700">How to use:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Select your preferred language</li>
          <li>Click "Start Recording" and describe your complaint</li>
          <li>Click "Stop Recording" when done</li>
          <li>Review the transcript and click "Extract Information"</li>
          <li>Verify the extracted details and submit</li>
        </ol>
      </div>
    </div>
  );
}
