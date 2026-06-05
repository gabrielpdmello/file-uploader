const { prisma } = require("../lib/prisma.js");

async function addFolder(name, parent, ownerId) {
    const folder = await prisma.folder.create({
        data: {
            name: name,
            parentId: parent,
            ownerId: ownerId
        }
    })
    return folder
};

async function getChildrenFolders(id) {
    const folders = await prisma.folder.findMany({
        where: { parentId: id }
    })
    return folders
};

async function getRootFolder(ownerId) {
    const root = await prisma.folder.findMany({
        where: {
            name: "root",
            parentId: null,
            ownerId: ownerId
        }
    })

    return root
}

async function getTrashFolder(ownerId) {
    const trash = await prisma.folder.findMany({
        where: {
            name: "trash",
            parentId: null,
            ownerId: ownerId
        }
    })

    return trash
}

async function moveFolder(folderId, parentId) {
    await prisma.folder.update({
        where: {
            id: folderId
        },
        data: {
            parentId: parentId
        }
    })
}

async function getFolder(id) {
    const folder = await prisma.folder.findMany({
        where: {
            id: id,
        }
    })

    return folder
}

async function getFiles(folderId) {
    const files = await prisma.file.findMany({
        where: {
            folderId: folderId
        }
    })
    return files
}

async function getFile(id) {
    const files = await prisma.file.findMany({
        where: {
            id: id
        }
    })
    return files
}

async function addFile(id, name, folderId) {
    const file = await prisma.file.create({
        data: {
            id: id,
            folder: {
                connect: { id: folderId }
            },
            name: name,
        }
    })
}

async function deleteFile(id) {
    const file = await prisma.file.delete({
        where: {
            id: id,
        }
    })
    return file
}

async function deleteFolder(id) {
    const deletedFiles = await prisma.$queryRaw`
    WITH RECURSIVE folderTree AS (
        SELECT * FROM "Folder" WHERE id = ${id}
        UNION ALL
        SELECT f.* FROM "Folder" f
        INNER JOIN folderTree ft ON f."parentId" = ft.id
    )
    SELECT f.* FROM folderTree ft
    join "File" f on (ft.id = f."folderId");
    `
    const folder = await prisma.folder.delete({
        where: {
            id: id,
        }
    })
    return deletedFiles
}

module.exports = {
    addFolder,
    getChildrenFolders,
    getRootFolder,
    getFolder,
    getFiles,
    getFile,
    addFile,
    deleteFile,
    deleteFolder,
    moveFolder,
    getTrashFolder
}