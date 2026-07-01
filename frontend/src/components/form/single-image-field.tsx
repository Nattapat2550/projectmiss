"use client";

import { ImageIcon, Plus, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function SingleImageField({
	file,
	previewUrl,
	onChange,
	onRemove,
}: {
	file: File | undefined | null;
	previewUrl: string;
	onChange: React.ChangeEventHandler;
	onRemove: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragover, setDragover] = useState(false);

	useEffect(() => {
		if (inputRef.current) {
			const dataTransfer = new DataTransfer();
			if (file) {
				dataTransfer.items.add(file);
			}
			inputRef.current.files = dataTransfer.files;
		}
	}, [file]);

	return (
		<div className="relative flex flex-wrap justify-center gap-4">
			<label
				htmlFor="image-file-input"
				className="group relative size-40"
				onDragEnter={() => setDragover(true)}
				onDragLeave={() => setDragover(false)}
				onDragExit={() => setDragover(false)}
				onDragEnd={() => setDragover(false)}
				onDrop={() => setDragover(false)}
			>
				{/* File Receptor */}
				<input
					id="image-file-input"
					type="file"
					accept="image/*"
					ref={inputRef}
					onChange={onChange}
					className="absolute top-0 left-0 block h-full w-full cursor-pointer opacity-0"
				/>

				<div className="size-40 relative pointer-events-none select-none">
					{/* Image */}
					<img
						src={file ? URL.createObjectURL(file) : previewUrl}
						alt="Preview"
						className={cn(
							"size-40 rounded-xl border border-(--wrapper) object-cover shadow-sm",
							dragover ? "opacity-40" : "opacity-100"
						)}
					/>
					{/* Drag Overlay */}
					<div
						className={cn(
							"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity",
							dragover ? "opactiy-100" : "opacity-0"
						)}
					>
						<ImageIcon size={64} />
					</div>
				</div>
			</label>
			<div className="flex flex-col gap-2">
				<div>{file ? file.name : "ไม่ระบุรูปภาพ"}</div>
				{file ?
					<div className="flex gap-4">
						<label htmlFor="image-file-input">
							<div
								role="button"
								className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-200 px-4 py-2 text-sm font-bold text-slate-800 transition hover:opacity-90 active:scale-[0.98] dark:bg-stone-800 dark:text-slate-200"
							>
								<ImageIcon size={16} />
								<span>เปลี่ยนรูป</span>
							</div>
						</label>
						<button
							type="button"
							className="flex cursor-pointer items-center gap-1.5 rounded-lg border-(--redBorder) bg-(--redBG) px-4 py-2 text-sm font-bold text-(--redText) transition hover:opacity-90 active:scale-[0.98]"
							onClick={onRemove}
						>
							<X size={16} />
							<span>ลบรูป</span>
						</button>
					</div>
				:	<label htmlFor="image-file-input">
						<div
							role="button"
							className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Plus size={16} />
							<span>เพิ่มรูป</span>
						</div>
					</label>
				}
			</div>
		</div>
	);
}