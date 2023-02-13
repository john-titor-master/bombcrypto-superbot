"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface) {
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS `Configs` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `username` VARCHAR(255), `lastServer` VARCHAR(255),  `materialAlert` INTEGER, `telegramCommands` INTEGER, `lastReport` INTEGER, `start` INTEGER, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS `HeroShields` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `hero` INTEGER, `shield` INTEGER, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS  `HeroZeroShields` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `hero` INTEGER, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS  `LastResetShields` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `date` INTEGER, `hero` INTEGER, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS  `MapEntities` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `date` INTEGER, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS  `Reports` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `date` INTEGER, `bcoin` FLOAT, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      await queryInterface.sequelize.query(
         "CREATE TABLE IF NOT EXISTS  `Rewards` (`id` INTEGER PRIMARY KEY AUTOINCREMENT, `identify` VARCHAR(255), `type` VARCHAR(255), `network` VARCHAR(255), `date` INTEGER, `value` FLOAT, `claimPending` FLOAT, `remainTime` FLOAT, `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL)"
      );
      queryInterface.addColumn(`Configs`, "network", {
         type: DataTypes.STRING,
         allowNull: true,
      });
   },

   async down(queryInterface) {
      queryInterface.removeColumn("Configs", "network");
   },
};
