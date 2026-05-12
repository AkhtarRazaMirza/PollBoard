export default function QuestionBlock({
  question,
  questionIndex,
  errors,
  canRemoveQuestion,
  onQuestionChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRemoveQuestion,
}) {
  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Question {questionIndex + 1}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Keep the wording direct so people can answer quickly.
          </p>
        </div>

        {canRemoveQuestion ? (
          <button
            type="button"
            onClick={onRemoveQuestion}
            className="text-sm font-medium text-red-600 transition-colors duration-200 hover:text-red-700"
          >
            Remove question
          </button>
        ) : null}
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Question text
          </label>
          <input
            type="text"
            value={question.prompt}
            onChange={(event) => onQuestionChange("prompt", event.target.value)}
            placeholder="What should we build next?"
            className="field"
          />
          {errors?.prompt ? (
            <p className="mt-2 text-sm text-red-600">{errors.prompt}</p>
          ) : null}
        </div>

        <label className="inline-flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(event) => onQuestionChange("required", event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
          />
          Required question
        </label>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Options</label>
            <button type="button" onClick={onAddOption} className="text-link">
              Add option
            </button>
          </div>

          <div className="space-y-3">
            {question.options.map((option, optionIndex) => (
              <div key={option.id} className="flex items-start gap-3">
                <input
                  type="text"
                  value={option.text}
                  onChange={(event) => onOptionChange(option.id, event.target.value)}
                  placeholder={`Option ${optionIndex + 1}`}
                  className="field"
                />
                <button
                  type="button"
                  onClick={() => onRemoveOption(option.id)}
                  disabled={question.options.length <= 2}
                  className="btn-secondary whitespace-nowrap"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {errors?.options ? (
            <div className="mt-2 space-y-1">
              {errors.options.map((message, index) =>
                message ? (
                  <p key={`${question.id}-${index}`} className="text-sm text-red-600">
                    {message}
                  </p>
                ) : null,
              )}
            </div>
          ) : null}

          {errors?.summary ? (
            <p className="mt-2 text-sm text-red-600">{errors.summary}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}