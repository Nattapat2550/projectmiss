"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ServerCrash } from "lucide-react";

export default function ServerAwaker({ children }: { children: React.ReactNode }) {
  const [isServerAlive, setIsServerAlive] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 🟢 แก้ไข: เปลี่ยนไปปิงที่ Root URL (หน้าแรกสุด) ของ Backend แทนที่จะเป็น /auth/me
  // เพื่อหลีกเลี่ยง Error 401 Unauthorized กวนใจใน Console
  const API_PING_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkServerStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // ตั้งเวลา Timeout แค่ 4 วิ

        // ยิงไปที่ Base URL เฉยๆ เพื่อเช็คว่าเซิร์ฟเวอร์ตอบสนองไหม
        const res = await fetch(API_PING_URL, {
          method: "GET",
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // ถ้า Backend ส่งอะไรกลับมา (เช่น 200 OK หรือ 404 Not Found) แปลว่าเซิร์ฟเวอร์ตื่นแล้ว
        if (res) {
          setIsServerAlive(true);
        }
      } catch (error) {
        // กรณี Network Error (เซิร์ฟเวอร์หลับ/ยังไม่เปิด) จะหลุดมาที่นี่
        setRetryCount((prev) => prev + 1);
        setIsServerAlive(false);
      }
    };

    if (isServerAlive !== true) {
      checkServerStatus();
      // ยิงเช็คสถานะและปลุกเซิร์ฟเวอร์ทุกๆ 3.5 วินาที
      intervalId = setInterval(checkServerStatus, 3500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isServerAlive]);

  if (isServerAlive === null) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center space-y-4 bg-background p-6">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <div className="text-muted-foreground font-medium animate-pulse">กำลังโหลดระบบ...</div>
      </div>
    );
  }

  if (isServerAlive === false) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-background p-6 transition-all duration-300">
        <div className="max-w-md w-full bg-(--container) border border-(--wrapper) rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="relative flex justify-center items-center">
            <div className="absolute w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <ServerCrash className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">กำลังปลุกระบบหลังบ้าน (Backend)</h2>
            <p className="text-sm text-muted-foreground px-4">
              ระบบกำลังเริ่มทำงานเนื่องจากไม่มีการใช้งานชั่วคราวบน Cloud อาจใช้เวลาประมาณ 30-50 วินาที โปรดรอสักครู่...
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 text-xs text-left font-mono space-y-1 border border-(--wrapper)">
            <div className="flex justify-between text-muted-foreground">
              <span>สถานะเซิร์ฟเวอร์:</span>
              <span className="text-amber-500 font-semibold animate-pulse">Waking Up...</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ยิงคำขอเพื่อปลุกแล้ว:</span>
              <span>{retryCount} ครั้ง</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}