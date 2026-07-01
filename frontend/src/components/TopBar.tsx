"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { LogOut, Settings, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DarkModeBtn from './DarkModeBtn';

export default function TopBar() {
    const [user, setUser] = useState<{ id: string; name: string; color?: string } | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    
    // ใช้ตัวแปรเดียวกับหน้า Login และเปลี่ยนเป็น Port 8000 ตามเซิร์ฟเวอร์หลัก
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // 🟢 ฟังก์ชันกลางสำหรับล้างข้อมูล Auth ทั้งหมด ทั้ง localStorage และ Cookie
    // ต้องเรียกตัวนี้ทุกครั้งที่เจอ token หมดอายุ/ไม่ valid เพื่อไม่ให้ cookie ค้าง
    // ไม่งั้น middleware จะยังคิดว่า login อยู่ (เพราะมันเช็คแค่ "มี cookie หรือไม่")
    // แล้วจะเด้งออกจากหน้า /login กลับไปหน้าเดิมตลอด ทำให้ login ใหม่ไม่ได้
    const clearAuthData = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("user_id");
        document.cookie = `token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
        setUser(null);
    };

    // เช็คสถานะ Login
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");
                
                // 🟢 ดักจับกรณี token เป็นคำว่า "null" ด้วย
                if (!token || token === "null") {
                    const savedUser = localStorage.getItem("user");
                    if (savedUser && savedUser !== "null") {
                        setUser(JSON.parse(savedUser));
                    }
                    return;
                }

                // ยิงไปที่ /api/v1/auth/me
                const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include" // 🟢 จำเป็นมาก เพื่อให้ยอมรับการอ่าน/เขียน Cookie จาก Backend
                });
                
                // ✅ เพิ่มการเช็ค 401 (Unauthorized) เพื่อล้าง Token ทิ้ง (ทั้ง localStorage และ Cookie)
                if (res.status === 401) {
                    clearAuthData();
                    throw new Error("Unauthorized: Token is invalid or expired");
                }

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                
                if (data.success) {
                    setUser(data.data);
                } else {
                    // ลบของเก่าทิ้งถ้า Token ไม่ผ่าน
                    clearAuthData();
                }
            } catch (err) {
                console.error("Failed to fetch user", err);
            }
        };
        fetchUser();
    }, [backendUrl]);

    // ปิด dropdown เมื่อคลิกที่อื่น
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem("token");
            
            // ยิงไปที่ /api/v1/auth/logout เพื่อให้ Backend ลบ HttpOnly Cookie ให้
            await fetch(`${backendUrl}/api/v1/auth/logout`, {
                headers: token && token !== "null" ? { Authorization: `Bearer ${token}` } : undefined,
                credentials: "include" // 🟢 จำเป็นมาก เพื่อให้คำสั่งเคลียร์ Cookie ของ Backend ทำงานสำเร็จ
            });
            
            // 🚨 ล้างข้อมูล Auth ฝั่ง Client ทั้งหมด (localStorage + Cookie) ผ่านฟังก์ชันกลาง
            clearAuthData();

            router.push('/login');
            router.refresh(); // บังคับรีเฟรช 1 รอบเพื่อให้ Layout อัปเดตใหม่ทั้งหมด
        } catch (err) {
            console.error("Logout error", err);
            // 🟢 ถึง Backend ยิงไม่สำเร็จ ก็ยังต้องล้างข้อมูลฝั่ง Client เพื่อไม่ให้ค้าง login ผี
            clearAuthData();
            router.push('/login');
            router.refresh();
        }
    };

    return (
        <div 
         id="main-topbar" 
         className="flex justify-between items-center w-full px-4 sm:px-6 py-3 sm:py-4 shadow-md z-50 relative gap-2"
         style={{ backgroundColor: 'var(--header-bg)' }}
        >
            <Link href="/" aria-label="กลับหน้าหลัก ระบบติดตามงานมอบหมาย" className="shrink min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-4 group min-w-0">
                    <Image 
                        src="/police.png" 
                        alt="โลโก้ระบบติดตามงานมอบหมาย" 
                        width={40} 
                        height={40} 
                        className="transition-transform group-hover:scale-110 w-8 h-8 sm:w-10 sm:h-10 shrink-0" 
                        priority
                    />
                    <strong className="text-sm sm:text-lg lg:text-xl font-bold truncate text-white block">
                        ระบบติดตาม
                    </strong>
                </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <DarkModeBtn />

                <Link href="/help" aria-label="ไปหน้าช่วยเหลือการใช้งาน">
                    <button className="flex items-center gap-1 sm:gap-2 hover:bg-white/10 px-2 sm:px-4 py-2 rounded-lg transition-colors">
                        <Image src="/window.svg" alt="ไอคอนช่วยเหลือ" width={24} height={24} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                        <span className="font-medium hidden md:inline text-white">ช่วยเหลือ</span>
                    </button>
                </Link>

                {user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex items-center gap-2 sm:gap-3 bg-(--button) hover:opacity-80 px-2 sm:px-4 py-2 rounded-full transition-all border border-(--shadow) max-w-32.5 sm:max-w-50"
                            style={{
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.08)"
                            }}
                        >
                            <Image 
                                src="/user.png" 
                                alt="รูปโปรไฟล์ผู้ใช้งาน" 
                                width={24} 
                                height={24} 
                                className="rounded-full object-cover w-6 h-6 shrink-0"
                            />
                            <span className="font-medium text-foreground! truncate text-sm sm:text-base block">
                                {user.name}
                            </span>
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-(--container) border border-(--shadow) rounded-xl shadow-lg py-2 flex flex-col overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-(--shadow) bg-(--button)/40">
                                    <Image 
                                        src="/return.png" 
                                        alt="รูปโปรไฟล์ย่อ" 
                                        width={20} 
                                        height={20} 
                                        className="rounded-full shrink-0 h-auto"
                                    />
                                    <span className="font-semibold text-xs text-foreground! truncate">{user.name}</span>
                                </div>
                                
                                <Link 
                                    href="/user" 
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-(--button) text-foreground transition-colors"
                                    onClick={() => setDropdownOpen(false)}
                                >
                                    <Settings size={18} /> จัดการโปรไฟล์
                                </Link>
                                <button 
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-500 transition-colors w-full text-left"
                                >
                                    <LogOut size={18} /> ออกจากระบบ
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/login">
                        <button className="flex items-center gap-1 sm:gap-2 bg-(--orangeBG) text-(--orangeText) hover:opacity-90 px-3 sm:px-5 py-2 rounded-full transition-all font-medium text-sm sm:text-base whitespace-nowrap border border-(--orangeBorder) shadow-sm">
                            <LogIn size={18} className="w-4 h-4 sm:w-5 sm:h-5" /> เข้าสู่ระบบ
                        </button>
                    </Link>
                )}
            </div>
        </div>
    );
}