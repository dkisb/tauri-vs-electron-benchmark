import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function App() {
  const tasks = useQuery(api.tasks.getTasks);
  return (
    <main style={{ padding: '24px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
      {tasks?.map(({ _id, text }) => (
        <div key={_id}>{text}</div>
      ))}
    </main>
  );
}
