import { Link } from "react-router-dom";

const defaultLinks = [];

export default function Navbar({
  isAuthenticated = false,
  currentUser = null,
  onLogout,
  links = defaultLinks,
}) {
  const displayName =
    currentUser?.name || currentUser?.username || currentUser?.email || "Signed in";

  return (
    <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link
          to="/"
          className="flex items-center gap-3 text-base font-semibold text-gray-900 transition-colors duration-200 hover:text-blue-600"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
            PB
          </span>
          PollBoard
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-gray-600 md:flex">
          {links.map((link) =>
            link.href ? (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors duration-200 hover:text-gray-900"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.to}
                className="transition-colors duration-200 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-600 sm:inline-flex">
                {displayName}
              </span>
              <Link to="/create-poll" className="btn-secondary hidden sm:inline-flex">
                New poll
              </Link>
              <button type="button" onClick={onLogout} className="btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">
                Login
              </Link>
              <Link to="/signup" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}