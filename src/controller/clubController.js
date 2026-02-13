const Club = require("../models/Club");

// Get all clubs
exports.getAllClubs = async (req, res) => {
    console.log("DEBUG: GET /api/clubs hit");
    try {
        const clubs = await Club.find().sort({ createdAt: -1 });
        res.status(200).json(clubs);
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// Create a club
exports.createClub = async (req, res) => {
    try {
        const { name, description, bannerUrl } = req.body;
        if (!name) return res.status(400).json({ msg: "Name is required" });

        const club = await Club.create({ name, description, bannerUrl });
        res.status(201).json(club);
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// Update a club
exports.updateClub = async (req, res) => {
    try {
        const club = await Club.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!club) return res.status(404).json({ msg: "Club not found" });
        res.status(200).json(club);
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// Delete a club
exports.deleteClub = async (req, res) => {
    try {
        const club = await Club.findByIdAndDelete(req.params.id);
        if (!club) return res.status(404).json({ msg: "Club not found" });
        res.status(200).json({ msg: "Club deleted successfully" });
    } catch (err) {
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};
