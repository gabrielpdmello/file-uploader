const { prisma } = require("../lib/prisma.js");

async function createUser(name, username, password) {
    const user = await prisma.user.create({
        data: {
            name: name,
            username: username,
            password: password,
        }
    })
    await prisma.folder.create({
        data: {
            name: "folder",
            user: {
                connect: {id: user.id}
            },
            root: "folder"

        }
    })
    await prisma.folder.create({
        data: {
            name: "trash",
            user: {
                connect: {id: user.id}
            },
            accept_file: false,
            accept_folder: false,
            root: "trash"

        }
    })
    await prisma.folder.create({
        data: {
            name: "share",
            user: {
                connect: {id: user.id}
            },
            accept_file: false,
            accept_folder: false,
            root: "share"
        }
    })
}

async function findByUsername(username) {
    const user = await prisma.user.findUnique({
        where: {
            username: username,
        },
    });
    return user
}

async function findById(id) {
    const user = await prisma.user.findUnique({
        where: {id: id},
    });
    return user
}

module.exports = {
    createUser,
    findByUsername,
    findById
}