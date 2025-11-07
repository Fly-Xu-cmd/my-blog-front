import StatusDetail from "../components/StatusDetail";

export default async function Status({ params }: { params: { id: string } }) {
  const { id } = await params;
  return <StatusDetail id={id} />;
}
