const { prisma } = require("../lib/prisma.js");

async function addFolder(name, parent, ownerId) {
    const folder = await prisma.folder.create({
        data: {
            name: name,
            parent: parent,
            ownerId: ownerId,
        }
    })
};

async function getChildrenFolders(id) {
    const folders = await prisma.folder.findMany({
        where: { parent: id }
    })
    return folders
};

async function getRootFolder(ownerId) {
    const root = await prisma.folder.findMany({
        where: {
            parent: null,
            ownerId: ownerId
        }
    })

    return root
}

async function getFiles(folderId) {
    const files = await prisma.file.findMany({
        where: {
            folderId: folderId
        }
    })
    return files
}

async function addFile(name, folderId) {
    console.log(name)
    const file = await prisma.file.create({
        data: {
            folder: {
                connect: { id: folderId }
            },
            name: name,
        }
    })
}

module.exports = {
    addFolder,
    getChildrenFolders,
    getRootFolder,
    getFiles,
    addFile
}