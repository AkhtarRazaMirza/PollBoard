import { Link } from "react-router-dom";

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  actionButton,
}) {
  return (
    <div className="panel px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
        PB
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
        {description}
      </p>

      {actionLabel && actionTo ? (
        <div className="mt-5">
          <Link to={actionTo} className="btn-primary">
            {actionLabel}
          </Link>
        </div>
      ) : null}

      {actionButton ? <div className="mt-5">{actionButton}</div> : null}
    </div>
  );
}