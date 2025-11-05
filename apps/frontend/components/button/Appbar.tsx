"use client";

import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { LogOut, Search, Upload, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const AppBar = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex justify-between items-center px-4 py-3">
        {/* Logo Section */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-red-600 rounded-lg p-2">
            <Video className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold hidden sm:block">StreamHub</span>
        </Link>

        {/* Search Bar */}
        <form 
          onSubmit={handleSearch}
          className="flex-1 max-w-2xl mx-4 hidden md:flex"
        >
          <div className="flex w-full">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l-full focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-full hover:bg-gray-200 transition"
            >
              <Search className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Search Icon */}
          <button className="md:hidden p-2 hover:bg-gray-100 rounded-full">
            <Search className="h-5 w-5" />
          </button>

          {/* Upload Button */}
          <Link
            href="/upload"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            <Upload className="h-5 w-5" />
            <span className="hidden sm:inline">Upload</span>
          </Link>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 rounded-full p-1 pr-3 transition">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden lg:block max-w-[120px] truncate">
                    {user.name}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-red-600 focus:text-red-600"
                  onClick={() => signOut()}
                >
                  <LogOut size={16} />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppBar;

