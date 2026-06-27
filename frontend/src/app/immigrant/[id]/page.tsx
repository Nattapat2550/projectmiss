import { getSingleImmigrantData } from "@/lib/server/immigrant";

export default async function SingleImmigrant({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const data = await getSingleImmigrantData(id);

	return (
		<div>
			<pre>{JSON.stringify(data, undefined, " ")}</pre>;
		</div>
	);
}
