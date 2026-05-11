import { Router } from "express";

const router = Router();

router.post("/", (req, res) => {
  res.json({ message: "Poll creation attempt" });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `Fetching poll with ID: ${id}` });
});

router.post("/:id/vote", (req, res) => {
  const { id } = req.params;
  const { option } = req.body;
  res.json({ message: `Voting for option ${option} in poll with ID: ${id}` });
});

router.get("/:id/results", (req, res) => {
  const { id } = req.params;
  res.json({ message: `Fetching results for poll with ID: ${id}` });
});



export default router;