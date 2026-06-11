import { useMemo, useState, useCallback, useRef } from "react";
import { TabStrip, TabStripTab } from "@progress/kendo-react-layout";
import { NotificationGroup, Notification } from "@progress/kendo-react-notification";
import { computeStats, applyMove, computeDemand } from "./engine/clash.js";
import { SESSIONS, ROOMS, SLOTS, INITIAL_ASSIGNMENTS, generateAttendees, EVENT } from "./data/seed.js";
import ScoreHeader from "./components/ScoreHeader";
import SchedulerBoard from "./components/SchedulerBoard";
// ⛑ FALLBACK: if the Kendo Scheduler fights you past 90 min, swap the line above for:
// import SchedulerBoard from "./components/BoardFallback";
import DemandChart from "./components/DemandChart";
import SessionsGrid from "./components/SessionsGrid";
import "./styles.css";

const attendees = generateAttendees();
const demand = computeDemand(attendees);
const DATA = { sessions: SESSIONS, rooms: ROOMS, attendees, slots: SLOTS, demand };

type Toast = { id: number; type: "success" | "warning" | "error"; text: string };

export default function App() {
  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [tab, setTab] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const stats = useMemo(() => computeStats(assignments, DATA), [assignments]);

  const pushToast = useCallback((type: Toast["type"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const handleMove = useCallback(
    (sessionId: string, roomId: string, slot: number) => {
      setAssignments((prev) => {
        const before = computeStats(prev, DATA);
        const next = applyMove(prev, sessionId, roomId, slot);
        const after = computeStats(next, DATA);
        const dAffected = before.affected - after.affected;
        const dSeats = before.seatsShort - after.seatsShort;
        const title = SESSIONS.find((s) => s.id === sessionId)?.title ?? sessionId;
        if (dAffected > 0 || dSeats > 0) {
          pushToast("success", `“${title}” moved — ${dAffected > 0 ? `${dAffected} fewer clashing attendees` : ""}${dAffected > 0 && dSeats > 0 ? ", " : ""}${dSeats > 0 ? `${dSeats} seats recovered` : ""}`);
        } else if (dAffected < 0 || dSeats < 0) {
          pushToast("error", `“${title}” moved — that made things worse (+${Math.max(0, -dAffected)} clashes, +${Math.max(0, -dSeats)} seats short)`);
        } else {
          pushToast("warning", `“${title}” moved — no change to clashes or capacity`);
        }
        return next;
      });
    },
    [pushToast]
  );

  return (
    <div className="app">
      <ScoreHeader stats={stats} attendeeCount={attendees.length} eventName={EVENT.name} />
      <main className="content">
        <TabStrip selected={tab} onSelect={(e) => setTab(e.selected)} className="tabs">
          <TabStripTab title="Agenda board">
            <SchedulerBoard assignments={assignments} stats={stats} data={DATA} onMove={handleMove} />
          </TabStripTab>
          <TabStripTab title="Room load">
            <DemandChart stats={stats} data={DATA} />
          </TabStripTab>
          <TabStripTab title="Sessions">
            <SessionsGrid assignments={assignments} stats={stats} data={DATA} />
          </TabStripTab>
        </TabStrip>
      </main>
      <NotificationGroup style={{ right: 16, bottom: 16, alignItems: "flex-end" }}>
        {toasts.map((t) => (
          <Notification key={t.id} type={{ style: t.type, icon: true }} closable={false}>
            <span>{t.text}</span>
          </Notification>
        ))}
      </NotificationGroup>
    </div>
  );
}
