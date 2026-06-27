"use client";

import { Book, Menu } from "lucide-react";
import Link from "next/link";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";


type MenuItem =
	| {
			title: string;
			url?: string;
			icon?: React.ReactNode;
			items: SubMenuItem[];
	  }
	| {
			title: string;
			url: string;
			icon?: React.ReactNode;
			items?: SubMenuItem[];
	  };

type SubMenuItem = {
	title: string;
	url: string;
	description?: string;
	icon?: React.ReactNode;
};

const menu: MenuItem[] = [
	{ title: "หน้าหลัก", url: "/" },
	{
		title: "แอบเข้า",
		items: [
			{
				title: "ข้อมูลทั้งหมด",
				icon: <Book className="size-5 shrink-0" />,
				url: "/immigrant",
			},
			{
				title: "เพิ่มข้อมูล",
				icon: <Book className="size-5 shrink-0" />,
				url: "/immigrant/create",
			},
		],
	},
	{
		title: "ส่งกลับ",
		url: "/repatriate",
		items: [
			{
				title: "ข้อมูลทั้งหมด",
				icon: <Book className="size-5 shrink-0" />,
				url: "/repatriate",
			},
			{
				title: "เพิ่มข้อมูล",
				icon: <Book className="size-5 shrink-0" />,
				url: "/repatriate/create",
			},
		],
	},
	{
		title: "แดชบอร์ด",
		icon: <Book className="size-5 shrink-0" />,
		url: "/dashboard",
	},
];

const auth = {
	login: { title: "เข้าสู่ระบบ", url: "/login" },
};

function Title() {
	return (
		<Link href="" className="flex items-center gap-2">
			<span className="text-lg font-semibold tracking-tighter">Title</span>
		</Link>
	);
}

export function Navigation({ className = "" }) {
	return (
		<section className={cn("p-4", className)}>
			<div className="container">
				{/* Desktop Menu */}
				<nav className="hidden items-center justify-between lg:flex">
					<div className="flex items-center gap-6">
						<Title />
						<div className="flex items-center">
							<NavigationMenu>
								<NavigationMenuList>
									{menu.map((item) => renderMenuItem(item))}
								</NavigationMenuList>
							</NavigationMenu>
						</div>
					</div>
					<div className="flex gap-2">
						<Button asChild size="sm">
							<a href={auth.login.url}>{auth.login.title}</a>
						</Button>
					</div>
				</nav>

				{/* Mobile Menu */}
				<div className="block lg:hidden">
					<div className="flex items-center justify-between">
						<Title />
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline" size="icon">
									<Menu className="size-4" />
								</Button>
							</SheetTrigger>
							<SheetContent className="overflow-y-auto">
								<SheetHeader>
									<SheetTitle>
										<Title />
									</SheetTitle>
								</SheetHeader>
								<div className="flex flex-col gap-6 p-4">
									<Accordion
										type="single"
										collapsible
										className="flex w-full flex-col gap-4"
									>
										{menu.map((item) => renderMobileMenuItem(item))}
									</Accordion>

									<div className="flex flex-col gap-3">
										<Button asChild>
											<a href={auth.login.url}>{auth.login.title}</a>
										</Button>
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</section>
	);
}

function renderMenuItem(item: MenuItem) {
	if (item.items) {
		return (
			<NavigationMenuItem key={item.title}>
				<NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
				<NavigationMenuContent className="bg-popover text-popover-foreground">
					{item.items.map((subItem) => (
						<NavigationMenuLink asChild key={subItem.title} className="w-80">
							<SubMenuLink item={subItem} />
						</NavigationMenuLink>
					))}
				</NavigationMenuContent>
			</NavigationMenuItem>
		);
	}

	return (
		<NavigationMenuItem key={item.title}>
			<NavigationMenuLink
				href={item.url}
				className="group bg-background hover:bg-muted hover:text-accent-foreground inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
			>
				{item.title}
			</NavigationMenuLink>
		</NavigationMenuItem>
	);
}

function renderMobileMenuItem(item: MenuItem) {
	if (item.items) {
		return (
			<AccordionItem key={item.title} value={item.title} className="border-b-0">
				<AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
					{item.title}
				</AccordionTrigger>
				<AccordionContent className="mt-2">
					{item.items.map((subItem) => (
						<SubMenuLink key={subItem.title} item={subItem} />
					))}
				</AccordionContent>
			</AccordionItem>
		);
	}

	return (
		<a key={item.title} href={item.url} className="text-md font-semibold">
			{item.title}
		</a>
	);
}

function SubMenuLink({ item }: { item: SubMenuItem }) {
	return (
		<a
			className="hover:bg-muted hover:text-accent-foreground flex min-w-80 flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
			href={item.url}
		>
			<div className="text-foreground">{item.icon}</div>
			<div>
				<div className="text-sm font-semibold">{item.title}</div>
				{item.description && (
					<p className="text-muted-foreground text-sm leading-snug">
						{item.description}
					</p>
				)}
			</div>
		</a>
	);
}
