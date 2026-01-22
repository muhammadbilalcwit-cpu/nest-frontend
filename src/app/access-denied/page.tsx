import React from "react";

export default function page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Access restricted
        </h1>

        <p className="mt-4 text-sm text-gray-600">
          You don’t have permission to access this
          resource.
        </p>

        <div className="mt-6">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
