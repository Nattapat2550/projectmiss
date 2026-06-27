"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Circle } from "lucide-react";

export const repatriateColumns: ColumnDef<RepatriateData>[] = [
	{
		header: "Name - TH",
		accessorFn: (row) =>
			[row.first_name_th, row.middle_name_th, row.last_name_th].join(" "),
	},
	{
		header: "Name - EN",
		accessorFn: (row) =>
			[row.first_name_en, row.middle_name_en, row.last_name_en].join(" "),
	},
	{
		header: "Gender",
		accessorKey: "gender",
		cell: ({ row }) => {
			const gender = row.getValue("gender");
			const color = gender == "male" ? "skyblue" : "pink";
			const text = gender == "male" ? "M" : "F";
			return (
				<div className="flex items-center gap-2">
					<Circle color={color} fill={color} />
					<span>{text}</span>
				</div>
			);
		},
	},
	{
		header: "Date Of Birth",
		accessorFn: (row) =>
			[row.birth_day, row.birth_month, row.birth_year].join("/"),
	},
	{
		header: "Residential Address",
		accessorKey: "address",
	},
	{
		header: "National ID",
		accessorKey: "national_id",
	},
	{
		header: "Passport",
		accessorKey: "passport_id",
	},
];
