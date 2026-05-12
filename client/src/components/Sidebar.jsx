import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    to: "/dashboard",
    description: "See your polls, status, and response counts.",
  },
  {
    label: "Create poll",
    to: "/create-poll",
    description: "Build a new poll with custom questions and options.",
  },
];

export default function Sidebar() {
  return (
    <aside className="w-full md:max-w-xs">
      <div className="panel p-3">
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Workspace
        </p>

        <nav className="mt-3 grid gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg border px-4 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-transparent bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50"
                }`
              }
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="mt-1 text-xs leading-5 text-gray-500">
                {item.description}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-600">
          Keep it short. Clear titles and two to four good options usually get better
          responses than crowded forms.
        </div>
      </div>
    </aside>
  );
}