import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const participationColors = ["#2563eb", "#0f766e"];

function StatCard({ label, value, tone = "default", helper }) {
  const toneClasses =
    tone === "accent"
      ? "border-blue-200 bg-blue-50"
      : "border-gray-200 bg-white";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`rounded-2xl border p-4 shadow-soft ${toneClasses}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <motion.p
        key={`${label}-${value}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-2xl font-semibold text-gray-900"
      >
        {value}
      </motion.p>
      {helper ? <p className="mt-2 text-sm text-gray-500">{helper}</p> : null}
    </motion.div>
  );
}

function InsightRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function AnalyticsWorkspace({
  analytics,
  selectedQuestionId,
  onSelectedQuestionIdChange,
  onExportCsv,
  onPrint,
  onPublish,
  isPublishing = false,
  className = "",
}) {
  const selectedQuestion =
    analytics.questions.find((question) => question.id === selectedQuestionId) ||
    analytics.questions[0] ||
    null;
  const chartData = (selectedQuestion?.options || []).map((option) => ({
    name: option.label,
    votes: option.votes,
    percentage: option.percentage,
  }));
  const participationData = [
    {
      name: "Anonymous",
      value: analytics.participation.anonymousResponses,
    },
    {
      name: "Authenticated",
      value: analytics.participation.authenticatedResponses,
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics overview</h2>
          <p className="mt-1 text-sm text-gray-600">
            Live results, participation insights, and question-level breakdowns.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onExportCsv} className="btn-secondary">
            Export CSV
          </button>
          <button type="button" onClick={onPrint} className="btn-secondary">
            Print view
          </button>
          {analytics.canPublishResults ? (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              className="btn-primary"
            >
              {isPublishing ? "Publishing..." : "Publish results"}
            </button>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total responses"
          value={analytics.totalResponses}
          tone="accent"
          helper="All submissions collected so far."
        />
        <StatCard
          label="Completion rate"
          value={`${analytics.participation.completionRate}%`}
          helper="Average question coverage across responses."
        />
        <StatCard
          label="Live viewers"
          value={analytics.viewerCount}
          helper="People currently watching this poll room."
        />
        <StatCard
          label="Avg. answers"
          value={analytics.participation.averageAnswersPerResponse}
          helper="Answers submitted per response."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Question performance
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Compare option counts for a selected question.
              </p>
            </div>

            {analytics.questions.length > 0 ? (
              <select
                value={selectedQuestion?.id || ""}
                onChange={(event) => onSelectedQuestionIdChange(event.target.value)}
                className="field max-w-xs"
              >
                {analytics.questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.prompt}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {selectedQuestion ? (
            <div className="mt-5 h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    interval={0}
                    angle={chartData.length > 3 ? -12 : 0}
                    textAnchor={chartData.length > 3 ? "end" : "middle"}
                    height={chartData.length > 3 ? 60 : 40}
                  />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="votes" fill="#2563eb" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">
              Responses will populate this chart once people start voting.
            </div>
          )}
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-5"
        >
          <h3 className="text-base font-semibold text-gray-900">Key insights</h3>
          <div className="mt-4 space-y-3">
            <InsightRow
              label="Visibility"
              value={analytics.resultsPublished ? "Public results" : "Private results"}
            />
            <InsightRow
              label="Status"
              value={
                analytics.resultsPublished
                  ? "Published"
                  : analytics.isExpired
                    ? "Expired"
                    : analytics.isClosed
                      ? "Closed"
                      : "Active"
              }
            />
            <InsightRow
              label="Most selected"
              value={
                analytics.mostSelectedOption
                  ? `${analytics.mostSelectedOption.label} (${analytics.mostSelectedOption.votes})`
                  : "No votes yet"
              }
            />
            <InsightRow
              label="Least selected"
              value={
                analytics.leastSelectedOption
                  ? `${analytics.leastSelectedOption.label} (${analytics.leastSelectedOption.votes})`
                  : "No votes yet"
              }
            />
          </div>

          <div className="mt-6 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={participationData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                >
                  {participationData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={
                        participationColors[index % participationColors.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-2">
            <InsightRow
              label="Anonymous share"
              value={`${analytics.participation.anonymousRatio}%`}
            />
            <InsightRow
              label="Authenticated share"
              value={`${analytics.participation.authenticatedRatio}%`}
            />
          </div>
        </motion.div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-5"
        >
          <h3 className="text-base font-semibold text-gray-900">Response trend</h3>
          <p className="mt-1 text-sm text-gray-500">
            Buckets update {analytics.responseTrend.interval === "day" ? "daily" : "hourly"}.
          </p>

          {analytics.responseTrend.buckets.length > 0 ? (
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={analytics.responseTrend.buckets}
                  margin={{ top: 12, right: 12, left: 0, bottom: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="responses"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-sm text-gray-600">
              Trend data will appear after the first response is recorded.
            </div>
          )}
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel p-5"
        >
          <h3 className="text-base font-semibold text-gray-900">Question summaries</h3>
          <div className="mt-4 space-y-3">
            {analytics.questionSummaries.map((summary) => (
              <div
                key={summary.id}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4"
              >
                <p className="text-sm font-semibold text-gray-900">{summary.question}</p>
                <div className="mt-3 space-y-2">
                  <InsightRow
                    label="Votes"
                    value={summary.totalVotes}
                  />
                  <InsightRow
                    label="Participation"
                    value={`${summary.participationRate}%`}
                  />
                  <InsightRow
                    label="Top option"
                    value={
                      summary.topOption
                        ? `${summary.topOption.label} (${summary.topOption.votes})`
                        : "No votes yet"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="space-y-4">
        {analytics.questions.map((question, questionIndex) => (
          <motion.article
            key={question.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="panel p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {questionIndex + 1}. {question.prompt}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {question.totalVotes} votes · {question.participationRate}% participation
                </p>
              </div>

              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600">
                {question.required ? "Required" : "Optional"}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {question.options.map((option) => (
                <div key={option.id}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-700">{option.label}</span>
                    <span className="font-medium text-gray-900">
                      {option.votes} votes ({option.percentage}%)
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${option.percentage}%` }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="h-3 rounded-full bg-blue-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.article>
        ))}
      </section>
    </div>
  );
}