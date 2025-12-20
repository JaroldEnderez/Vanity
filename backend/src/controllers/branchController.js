const prisma = require("../prisma/client");

// GET all branches
const getAllBranches = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      include: { staff: true, services: true },
    });
    res.json(branches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};

// GET branch by ID
const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: { staff: true, services: true },
    });
    if (!branch) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    res.json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch branch" });
  }
};

// CREATE branch
const createBranch = async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    const { name, address } = req.body;

    // Validation
    if (!name || !address) {
      res.status(400).json({
        error: "Name and address are required",
      });
      return;
    }

    const branch = await prisma.branch.create({
      data: { name, address },
    });
    res.status(201).json(branch);
  } catch (err) {
    console.error("Error creating branch:", err);

    // Handle Prisma unique constraint error
    if (err && err.code === "P2002") {
      res.status(409).json({
        error: "Branch with this name already exists",
      });
      return;
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({
      error: "Failed to create branch",
      details: message,
    });
  }
};

// UPDATE branch
const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const branch = await prisma.branch.update({
      where: { id },
      data: { name, address },
    });
    res.json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update branch" });
  }
};

// DELETE branch
const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.branch.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete branch" });
  }
};

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
};


