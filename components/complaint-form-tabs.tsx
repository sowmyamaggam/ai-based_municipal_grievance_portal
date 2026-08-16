"use client";

import { useState } from "react";
import { MessageSquare, Mic } from "lucide-react";
import { NewComplaintForm } from "@/components/new-complaint-form";
import { VoiceComplaintForm } from "@/components/voice-complaint-form";

export function ComplaintFormTabs() {
  const [activeTab, setActiveTab] = useState<"text" | "voice">("text");

  return (
    <div className="space-y-6">
      {/* Tab Buttons */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex items-center gap-2 px-4 py-3 font-medium ${
            activeTab === "text"
              ? "border-b-2 border-civic-600 text-civic-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          Text Complaint
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex items-center gap-2 px-4 py-3 font-medium ${
            activeTab === "voice"
              ? "border-b-2 border-civic-600 text-civic-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Mic className="h-5 w-5" />
          Voice Complaint
        </button>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {activeTab === "text" && <NewComplaintForm />}
        {activeTab === "voice" && <VoiceComplaintForm />}
      </div>
    </div>
  );
}
