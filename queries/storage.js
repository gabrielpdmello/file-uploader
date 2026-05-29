const { prisma } = require("../lib/prisma.js");

function addFolder(name, parent, ownerId) {
    const folder = await prisma.folder.create({
        data: {
            name: name,
            parent: parent,
            ownerId: ownerId,
        }
    })
};

function renameFolder();

function deleteFolder();

function getContents();

module.exports = [
    addFolder
]