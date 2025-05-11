"use client"
import CreatePost from "@/components/dashboard/create-post"
import React from 'react'
import { useUser } from "@clerk/nextjs"
type Props = {}

export default function page({}: Props) {
  const {isSignedIn,user, isLoaded}=useUser();
  if(!isLoaded){
    return null
  }
  return (
    <div>
        <CreatePost/>
    </div>
  )
}