"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Lock, User as UserIcon, Palette } from 'lucide-react';
import Swal from 'sweetalert2';
export default function UserProfilePage() {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#ffffff');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const getToken = () => {
        return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    };

    useEffect(() => {
        const fetchUserData = async () => {
            const token = getToken();
            if (!token) {
                router.push('/login');
                return;
            }
            try {
                const res = await fetch(`${backendUrl}/api/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setName(data.data.name || '');
                    setColor(data.data.color || '#ffffff');
                } else {
                    console.error("Error from API:", data.message);
                    router.push('/login');
                }
            } catch (err) {
                console.error("Error fetching user:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [router, backendUrl]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if(!token) return 
        Swal.fire({
            icon: 'error',
            title: 'Token Expired',
            text: 'Token expired. Please login again.'
        });

        try {
            // เรียกไปยัง /api/v1/auth/profile
            const res = await fetch(`${backendUrl}/api/v1/auth/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ name, color })
            });
            const data = await res.json().catch(() => ({}));
            
            if (res.ok && data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ!',
                    text: 'อัปเดตโปรไฟล์เรียบร้อยแล้ว',
                    timer: 1500,
                    showConfirmButton: false
                });
                window.location.reload(); 
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: `เกิดข้อผิดพลาดในการอัปเดตข้อมูล: ${data.msg || data.message || 'Unknown error'}`
                });
            }
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: `เกิดข้อผิดพลาด: ${err.message}`
            });
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = getToken();
        if(!token) return 
        Swal.fire({
            icon: 'error',
            title: 'Token Expired',
            text: 'Token expired. Please login again.'
        });

        try {
            // เรียกไปยัง /api/v1/auth/password
            const res = await fetch(`${backendUrl}/api/v1/auth/password`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ password })
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ!',
                    text: 'เปลี่ยนรหัสผ่านสำเร็จ',
                    timer: 1500,
                    showConfirmButton: false
                });
                setPassword('');
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: `เปลี่ยนรหัสผ่านไม่สำเร็จ: ${data.msg || data.message || 'Unknown error'}`
                });
            }
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: `เกิดข้อผิดพลาด: ${err.message}`
            });
        }
    };

    if (loading) {
        return <div className="p-10 text-center text-foreground">กำลังโหลด...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-(--header)">จัดการโปรไฟล์ผู้ใช้งาน</h1>

                {/* Form อัปเดตข้อมูลทั่วไป */}
                <form onSubmit={handleUpdateProfile} className="bg-(--container) p-6 rounded-2xl shadow-lg border border-(--shadow) space-y-4">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 border-b border-(--shadow) pb-2 mb-4">
                        <UserIcon size={20} /> ข้อมูลทั่วไป
                    </h2>
                    
                    <div>
                        <label className="block text-sm mb-1 text-foreground">ชื่อผู้ใช้งาน</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-(--button) border border-(--shadow) text-foreground"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1 text-foreground items-center gap-2">
                            <Palette size={16} /> สีประจำตัว (Profile Color)
                        </label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="color" 
                                value={color} 
                                onChange={(e) => setColor(e.target.value)}
                                className="w-16 h-10 p-1 rounded bg-(--button) border border-(--shadow) cursor-pointer"
                            />
                            <span className="text-foreground opacity-70 uppercase">{color}</span>
                        </div>
                    </div>

                    <button type="submit" className="flex items-center gap-2 bg-(--orangeBG) text-white px-6 py-2 rounded-lg hover:opacity-90">
                        <Save size={18} /> บันทึกข้อมูล
                    </button>
                </form>

                {/* Form เปลี่ยนรหัสผ่าน */}
                <form onSubmit={handleChangePassword} className="bg-(--container) p-6 rounded-2xl shadow-lg border border-(--shadow) space-y-4">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 border-b border-(--shadow) pb-2 mb-4">
                        <Lock size={20} /> เปลี่ยนรหัสผ่าน
                    </h2>
                    
                    <div>
                        <label className="block text-sm mb-1 text-foreground">รหัสผ่านใหม่</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-(--button) border border-(--shadow) text-foreground"
                            placeholder="กรอกรหัสผ่านใหม่" 
                            required 
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="flex items-center gap-2 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600">
                        <Save size={18} /> อัปเดตรหัสผ่าน
                    </button>
                </form>
            </div>
        </div>
    );
}