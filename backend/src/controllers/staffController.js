const prisma = require("../prisma/client");

// GET all staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await prisma.staff.findMany({
      include: { branch: true },
    });
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
};

// GET staff by ID
const getStaffById = async (req, res) => {
  try{
    const {id} = req.params
    const staff = await prisma.staff.findUnique({
      where: {id},
      include: {branch: true},
    })
    if (!staff){
      res.status(404).json({error: "Staff not found"})
    }
    res.json(staff)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch user"})
  }
};

// CREATE staff
const createStaff = async (req, res) => {
  try{
    const {name, role, branchId} = req.body;
    const staff = await prisma.staff.create({
      data: {name, role, branchId},
    })
    res.status(201).json(staff)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to create user"})
  }
}

// UPDATE staff
const updateStaff = async (req, res) => {
  try{
    const {id} = req.params
    const {name, role, branchId} = req.body
    const staff = await prisma.staff.update({
      where: id,
      data: {name, role, branchId}
    })
    res.json(staff)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to update user"})
  }
}

// DELETE staff
const deleteStaff = async (req, res) => {
  try{
    const {id} = req.params
    await prisma.staff.delete({
      where: {id},
    })
    res.status(204).send()
  }catch(err){
    console.error(err)
    res.status(500).json({error: "Failed to delete user"})
  }
}

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
};

