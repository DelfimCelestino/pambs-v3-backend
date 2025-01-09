/*
  Warnings:

  - You are about to drop the column `date` on the `movement` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `movement` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `movement` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `movement` table. All the data in the column will be lost.
  - You are about to drop the `message` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `balance` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cliente` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `datadoc` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `desconto` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `entidate` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numdoc` to the `Movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipodoc` to the `Movement` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `Message_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `message` DROP FOREIGN KEY `Message_userId_fkey`;

-- AlterTable
ALTER TABLE `movement` DROP COLUMN `date`,
    DROP COLUMN `description`,
    DROP COLUMN `status`,
    DROP COLUMN `type`,
    ADD COLUMN `balance` DOUBLE NOT NULL,
    ADD COLUMN `cliente` VARCHAR(191) NOT NULL,
    ADD COLUMN `datadoc` VARCHAR(191) NOT NULL,
    ADD COLUMN `desconto` VARCHAR(191) NOT NULL,
    ADD COLUMN `entidate` VARCHAR(191) NOT NULL,
    ADD COLUMN `numdoc` VARCHAR(191) NOT NULL,
    ADD COLUMN `tipodoc` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `message`;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `status` ENUM('PENDING', 'ANSWERED') NOT NULL DEFAULT 'PENDING',
    `clientId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `response` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `messages_clientId_idx`(`clientId`),
    INDEX `messages_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activities` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activities_userId_idx`(`userId`),
    INDEX `activities_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
