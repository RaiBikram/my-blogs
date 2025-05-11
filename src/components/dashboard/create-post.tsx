"use client"
import { useUser } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Form from "./form";



export default function CreatePost() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !user.publicMetadata.isAdmin)) {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      const timeout = setTimeout(() => {
        router.push("/");
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn && user.publicMetadata.isAdmin) {
    return (
      <>

        <Form />
      </>
    );
  } else {
    return (
      <div className="text-center text-3xl my-7 h-screen items-center flex justify-center flex-col font-semibold text-red-600">
        <p>You are not authorized to view this page.</p>

        <p className="text-xl text-gray-700 mt-4">
          Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}...
        </p>
      </div>
    );
  }
}
