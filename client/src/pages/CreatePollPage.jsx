import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionBlock from "../components/QuestionBlock";
import api from "../services/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function createLocalId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function createOption() {
  return {
    id: createLocalId("option"),
    text: "",
  };
}

function createQuestion() {
  return {
    id: createLocalId("question"),
    prompt: "",
    required: true,
    options: [createOption(), createOption()],
  };
}

function validatePollForm(formValues) {
  const errors = {
    title: "",
    expiry: "",
    questions: [],
  };

  if (!formValues.title.trim()) {
    errors.title = "Give your poll a title.";
  }

  if (formValues.expiresAt) {
    const expiryDate = new Date(formValues.expiresAt);

    if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      errors.expiry = "Expiry must be a future date and time.";
    }
  }

  errors.questions = formValues.questions.map((question) => {
    const questionErrors = {
      prompt: "",
      options: [],
      summary: "",
    };

    if (!question.prompt.trim()) {
      questionErrors.prompt = "Write the question text.";
    }

    const trimmedOptions = question.options.map((option) => option.text.trim());
    const filledOptions = trimmedOptions.filter(Boolean);
    const hasDuplicateOptions =
      new Set(filledOptions.map((option) => option.toLowerCase())).size !==
      filledOptions.length;

    if (filledOptions.length < 2) {
      questionErrors.summary = "Add at least two options.";
    } else if (hasDuplicateOptions) {
      questionErrors.summary = "Options should be different from each other.";
    }

    questionErrors.options = question.options.map((option) =>
      option.text.trim() ? "" : "Option text is required.",
    );

    return questionErrors;
  });

  const hasQuestionErrors = errors.questions.some(
    (questionErrors) =>
      questionErrors.prompt ||
      questionErrors.summary ||
      questionErrors.options.some(Boolean),
  );

  return {
    ...errors,
    hasErrors: Boolean(errors.title || errors.expiry || hasQuestionErrors),
  };
}

export default function CreatePollPage({ showNotification }) {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    voteAccess: "anonymous",
    expiresAt: "",
    questions: [createQuestion()],
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validation = useMemo(
    () => validatePollForm(formValues),
    [formValues],
  );

  const updateField = (fieldName, value) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      [fieldName]: value,
    }));
  };

  const updateQuestion = (questionId, fieldName, value) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      questions: previousValues.questions.map((question) =>
        question.id === questionId
          ? {
            ...question,
            [fieldName]: value,
          }
          : question,
      ),
    }));
  };

  const updateOption = (questionId, optionId, value) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      questions: previousValues.questions.map((question) =>
        question.id === questionId
          ? {
            ...question,
            options: question.options.map((option) =>
              option.id === optionId
                ? {
                  ...option,
                  text: value,
                }
                : option,
            ),
          }
          : question,
      ),
    }));
  };

  const addQuestion = () => {
    setFormValues((previousValues) => ({
      ...previousValues,
      questions: [...previousValues.questions, createQuestion()],
    }));
  };

  const removeQuestion = (questionId) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      questions: previousValues.questions.filter((question) => question.id !== questionId),
    }));
  };

  const addOption = (questionId) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      questions: previousValues.questions.map((question) =>
        question.id === questionId
          ? {
            ...question,
            options: [...question.options, createOption()],
          }
          : question,
      ),
    }));
  };

  const removeOption = (questionId, optionId) => {
    setFormValues((previousValues) => ({
      ...previousValues,
      questions: previousValues.questions.map((question) =>
        question.id === questionId
          ? {
            ...question,
            options:
              question.options.length <= 2
                ? question.options
                : question.options.filter((option) => option.id !== optionId),
          }
          : question,
      ),
    }));
  };

  const createPoll = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    if (validation.hasErrors) {
      showNotification("Please fix the highlighted fields before submitting.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const expiryDate = formValues.expiresAt
        ? new Date(formValues.expiresAt).toISOString()
        : null;

      const payload = {
        pollTitle: formValues.title.trim(),
        pollDescription: formValues.description.trim(),
        voteAccess: formValues.voteAccess,
        isAnonymous: formValues.voteAccess === "anonymous",
        expiresAt: expiryDate,
        questions: formValues.questions.map((question) => ({
          questionText: question.prompt.trim(),
          required: question.required,
          isRequired: question.required,
          options: question.options
            .map((option) => option.text.trim())
            .filter(Boolean),
        })),
      };

      console.log("PAYLOAD:", JSON.stringify(payload, null, 2));
      await api.post("/polls", payload);
      showNotification("Poll created successfully.", "success");
      navigate("/dashboard");
    } catch (error) {
      console.log(error.response?.data);
      showNotification(
        error.response?.data?.message || "Could not create poll.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={createPoll} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <section className="panel p-5">
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Poll title
              </label>
              <input
                type="text"
                value={formValues.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="End of semester feedback"
                className="field"
              />
              {submitAttempted && validation.title ? (
                <p className="mt-2 text-sm text-red-600">{validation.title}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Short description
              </label>
              <textarea
                rows="3"
                value={formValues.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Let people know what this poll is about."
                className="field resize-none"
              />
            </div>
          </div>
        </section>

        <div className="space-y-4">
          {formValues.questions.map((question, questionIndex) => (
            <QuestionBlock
              key={question.id}
              question={question}
              questionIndex={questionIndex}
              errors={submitAttempted ? validation.questions[questionIndex] : null}
              canRemoveQuestion={formValues.questions.length > 1}
              onQuestionChange={(fieldName, value) =>
                updateQuestion(question.id, fieldName, value)
              }
              onOptionChange={(optionId, value) =>
                updateOption(question.id, optionId, value)
              }
              onAddOption={() => addOption(question.id)}
              onRemoveOption={(optionId) => removeOption(question.id, optionId)}
              onRemoveQuestion={() => removeQuestion(question.id)}
            />
          ))}
        </div>

        <button type="button" onClick={addQuestion} className="btn-secondary">
          Add another question
        </button>
      </div>

      <aside className="space-y-4">
        <section className="panel p-5">
          <h2 className="text-base font-semibold text-gray-900">Poll settings</h2>

          <div className="mt-4 space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">Who can vote?</p>
              <div className="grid gap-3">
                {[
                  {
                    value: "anonymous",
                    label: "Anonymous voting",
                    description: "Anyone with the link can answer without logging in.",
                  },
                  {
                    value: "authenticated",
                    label: "Login required",
                    description: "Respondents need an account before they can vote.",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border px-4 py-3 transition-all duration-200 ${formValues.voteAccess === option.value
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="voteAccess"
                        value={option.value}
                        checked={formValues.voteAccess === option.value}
                        onChange={(event) => updateField("voteAccess", event.target.value)}
                        className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-200"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          {option.description}
                        </span>
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Expiry date
              </label>
              <DatePicker
                selected={
                  formValues.expiresAt
                    ? new Date(formValues.expiresAt)
                    : null
                }
                onChange={(date) =>
                  updateField(
                    "expiresAt",
                    date ? date.toISOString() : ""
                  )
                }
                showTimeSelect
                timeFormat="hh:mm aa"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                placeholderText="Select expiry date"
                className="field w-full"
              />
              {submitAttempted && validation.expiry ? (
                <p className="mt-2 text-sm text-red-600">{validation.expiry}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-base font-semibold text-gray-900">Quick summary</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <p>{formValues.questions.length} questions added</p>
            <p>
              {formValues.questions.reduce(
                (total, question) => total + question.options.length,
                0,
              )}{" "}
              total options
            </p>
            <p>
              {formValues.voteAccess === "anonymous"
                ? "Anonymous voting is enabled"
                : "Only logged-in users can vote"}
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary mt-5 w-full"
          >
            {isSubmitting ? "Creating poll..." : "Create poll"}
          </button>
        </section>
      </aside>
    </form>
  );
}