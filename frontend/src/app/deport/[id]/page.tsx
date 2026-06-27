import { getSingleRepatriateData } from "@/lib/server/repatriate";

export default async function SingleRepatriate({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const data = await getSingleRepatriateData(id);

	return (
		<div>
			<h1>ส่งกลับ</h1>
			<pre>{JSON.stringify(data, undefined, " ")}</pre>;
		</div>
	);
}
