"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Circle } from "lucide-react";

export const immigrantColumns: ColumnDef<ImmigrantData>[] = [
	{
		header: "Name",
		accessorFn: (row) =>
			[row.first_name, row.middle_name, row.last_name].join(" "),
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
		header: "Nationality",
		accessorKey: "nationality",
	},
	{
		header: "Detected Location",
		accessorKey: "detected_location",
	},
	{
		header: "Is Victim",
		accessorKey: "is_victim",
	},
];
