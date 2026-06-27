"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import Swal from 'sweetalert2';
import { InputField } from './InputField';
import { SubmitButton } from './SubmitButton';

const LoginForm = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: username, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // บันทึก Token ลง Cookie (ใช้ SameSite=Lax หรือ Strict ตามเหมาะสม)
                document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure' : ''}`;
                
                // บันทึก Token และ User ลง LocalStorage
                localStorage.setItem("user_id", data.user.id);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));

                await Swal.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ!',
                    showConfirmButton: false,
                    timer: 1500
                });

                // ✨ ตรวจสอบว่ามี callbackUrl (หน้าก่อนหน้าที่ถูกเด้งมา) อยู่ใน Address Bar หรือไม่
                const searchParams = new URLSearchParams(window.location.search);
                const callbackUrl = searchParams.get('callbackUrl');

                // ถ้ามี URL เดิมติดมาด้วย ให้พากลับไปหน้าเดิม แต่ถ้าไม่มีให้พากลับหน้า /dashboard
                const decodedUrl = decodeURIComponent(callbackUrl || '');
                if (decodedUrl && decodedUrl.startsWith('/') && !decodedUrl.startsWith('//')) {
                    window.location.href = decodedUrl;
                } else {
                    window.location.href = '/dashboard';
                }

            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เข้าสู่ระบบไม่สำเร็จ',
                    text: data.msg || data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
                });
            }
        } catch (error) {
            console.error('Error logging in:', error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-(--container) p-8 rounded-2xl flex flex-col gap-2 border-2 border-(--shadow) transition-all mx-auto mt-20 shadow-lg">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-(--header) mb-2">ยินดีต้อนรับ</h1>
                <p className="text-foreground opacity-70">กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                <InputField
                    label="ชื่อผู้ใช้งาน"
                    icon={<User size={16} />}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="กรอกชื่อผู้ใช้งาน"
                    required
                />

                <InputField
                    label="รหัสผ่าน"
                    icon={<Lock size={16} />}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่าน"
                    required
                    rightElement={
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-foreground opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    }
                />

                <SubmitButton loading={loading} loadingText="กำลังเข้าสู่ระบบ...">
                    เข้าสู่ระบบ
                </SubmitButton>
            </form>
        </div>
    );
};

export default LoginForm;