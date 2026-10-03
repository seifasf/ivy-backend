const Contact = require("../model/contact.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Create Contact
const createContact = asyncWrapper(async (req, res) => {
  const { name, email, phone, comment, status } = req.body;
  const contact = new Contact({ name, email, phone, comment, status });
  await contact.save();
  res.status(201).json(contact);
});

// Get All Contacts
const getAllContacts = asyncWrapper(async (req, res) => {
  const contacts = await Contact.find({}, { __v: false });
  res.json(contacts);
});

// Get Contact By ID
const getContactById = asyncWrapper(async (req, res) => {
  const contact = await Contact.findById(req.params.id, { __v: false });
  if (!contact) return res.status(404).json({ message: "Contact not found" });
  res.json(contact);
});

// Update Contact
const updateContact = asyncWrapper(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: "Contact not found" });

  const { name, email, phone, comment, status } = req.body;
  contact.name = name ?? contact.name;
  contact.email = email ?? contact.email;
  contact.phone = phone ?? contact.phone;
  contact.comment = comment ?? contact.comment;
  contact.status = status ?? contact.status;

  await contact.save();
  res.json(contact);
});

// Delete Contact
const deleteContact = asyncWrapper(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) return res.status(404).json({ message: "Contact not found" });

  await contact.deleteOne();
  res.json({ message: "Contact deleted" });
});

module.exports = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
};
