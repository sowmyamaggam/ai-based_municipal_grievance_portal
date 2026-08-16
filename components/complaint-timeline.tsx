"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  FileText,
  MapPin,
  Image,
  MessageSquare,
  Flag,
} from "lucide-react";

interface TimelineEvent {
  _id: string;
  action: string;
  actor?: string;
  actorName: string;
  previousValue?: string;
  newValue?: string;
  remarks?: string;
  createdAt: string;
}

interface ComplaintTimelineProps {
  complaintId: string;
}

export function ComplaintTimeline({ complaintId }: ComplaintTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimeline();
  }, [complaintId]);

  async function fetchTimeline() {
    try {
      const response = await fetch(`/api/complaints/${complaintId}`);
      if (!response.ok) throw new Error("Failed to fetch complaint");

      const data = await response.json();
      setEvents(data.complaint.history || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
      console.error("Timeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const getEventIcon = (action: string) => {
    const iconProps = { className: "h-5 w-5" };

    switch (action) {
      case "COMPLAINT_SUBMITTED":
      case "COMPLAINT_CREATED":
        return <FileText {...iconProps} className="h-5 w-5 text-blue-600" />;
      case "COMPLAINT_ASSIGNED":
      case "ASSIGNED":
        return <User {...iconProps} className="h-5 w-5 text-purple-600" />;
      case "STATUS_CHANGED":
      case "ASSIGNMENT_ACCEPTED":
      case "ASSIGNMENT_DECLINED":
      case "OFFICER_ACCEPTED":
      case "OFFICER_DECLINED":
        return <Flag {...iconProps} className="h-5 w-5 text-orange-600" />;
      case "COMMENT_ADDED":
      case "OFFICER_UPDATED":
      case "OFFICER_COMMENT":
        return <MessageSquare {...iconProps} className="h-5 w-5 text-green-600" />;
      case "EVIDENCE_UPLOADED":
      case "ATTACHMENT_ADDED":
      case "IMAGE_UPLOADED":
        return <Image {...iconProps} className="h-5 w-5 text-indigo-600" />;
      case "LOCATION_ADDED":
      case "LOCATION_PROVIDED":
        return <MapPin {...iconProps} className="h-5 w-5 text-red-600" />;
      case "COMPLAINT_RESOLVED":
      case "RESOLVED":
        return <CheckCircle2 {...iconProps} className="h-5 w-5 text-green-600" />;
      case "COMPLAINT_REOPENED":
      case "REOPENED":
        return <AlertCircle {...iconProps} className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock {...iconProps} className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventColor = (action: string): string => {
    switch (action) {
      case "COMPLAINT_SUBMITTED":
      case "COMPLAINT_CREATED":
        return "bg-blue-100";
      case "COMPLAINT_ASSIGNED":
      case "ASSIGNED":
        return "bg-purple-100";
      case "STATUS_CHANGED":
        return "bg-orange-100";
      case "COMPLAINT_RESOLVED":
      case "RESOLVED":
        return "bg-green-100";
      case "COMPLAINT_REOPENED":
      case "REOPENED":
        return "bg-yellow-100";
      default:
        return "bg-gray-100";
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      COMPLAINT_SUBMITTED: "Complaint Submitted",
      COMPLAINT_CREATED: "Complaint Created",
      COMPLAINT_ASSIGNED: "Assigned to Officer",
      ASSIGNED: "Assigned to Officer",
      STATUS_CHANGED: "Status Updated",
      ASSIGNMENT_ACCEPTED: "Assignment Accepted",
      ASSIGNMENT_DECLINED: "Assignment Declined",
      OFFICER_ACCEPTED: "Accepted",
      OFFICER_DECLINED: "Declined",
      COMMENT_ADDED: "Comment Added",
      OFFICER_UPDATED: "Officer Update",
      OFFICER_COMMENT: "Officer Comment",
      EVIDENCE_UPLOADED: "Evidence Uploaded",
      ATTACHMENT_ADDED: "Attachment Added",
      IMAGE_UPLOADED: "Image Uploaded",
      LOCATION_ADDED: "Location Added",
      LOCATION_PROVIDED: "Location Provided",
      COMPLAINT_RESOLVED: "Complaint Resolved",
      RESOLVED: "Resolved",
      COMPLAINT_REOPENED: "Complaint Reopened",
      REOPENED: "Reopened",
      AI_ANALYSIS_COMPLETED: "AI Analysis Completed",
      PRIORITY_CHANGED: "Priority Changed",
      CATEGORY_CHANGED: "Category Changed",
      DEPARTMENT_ASSIGNED: "Department Assigned",
      DUPLICATE_DETECTED: "Duplicate Detected",
    };

    return labels[action] || action.replace(/_/g, " ");
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-gray-600">Loading timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-gray-600">No timeline events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-6">
        <h3 className="mb-6 text-lg font-semibold text-gray-900">
          Complaint Timeline
        </h3>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-gray-300"></div>

          {/* Timeline Events */}
          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={event._id || index} className="relative pl-16">
                {/* Event Icon */}
                <div className="absolute -left-3 top-1 rounded-full bg-white p-1.5 shadow-md">
                  {getEventIcon(event.action)}
                </div>

                {/* Event Content */}
                <div className={`rounded-lg ${getEventColor(event.action)} border border-gray-200 p-4`}>
                  {/* Event Header */}
                  <div className="flex flex-col justify-between sm:flex-row sm:items-center">
                    <h4 className="font-semibold text-gray-900">
                      {getActionLabel(event.action)}
                    </h4>
                    <time className="mt-1 text-sm text-gray-500 sm:mt-0">
                      {formatDistanceToNow(new Date(event.createdAt), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>

                  {/* Event Details */}
                  <div className="mt-3 space-y-2">
                    {event.actorName && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">By:</span> {event.actorName}
                      </p>
                    )}

                    {event.newValue && (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">New Status:</span>{" "}
                        <span className="inline-block rounded bg-white px-2 py-0.5">
                          {event.newValue}
                        </span>
                      </p>
                    )}

                    {event.previousValue && event.newValue && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Changed from:</span>{" "}
                        <span className="inline-block rounded bg-white px-2 py-0.5">
                          {event.previousValue}
                        </span>
                      </p>
                    )}

                    {event.remarks && (
                      <div className="mt-2 rounded bg-white p-2">
                        <p className="text-sm text-gray-700">{event.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* Exact Timestamp */}
                  <p className="mt-3 text-xs text-gray-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Total Events</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{events.length}</p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">First Event</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {events[0]?.createdAt
              ? new Date(events[0].createdAt).toLocaleDateString()
              : "N/A"}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-600">Last Event</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {events[events.length - 1]?.createdAt
              ? new Date(events[events.length - 1].createdAt).toLocaleDateString()
              : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
