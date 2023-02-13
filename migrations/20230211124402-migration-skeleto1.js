"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   async up(queryInterface) {
      queryInterface.addColumn(`Configs`, "teste", {
         type: DataTypes.STRING,
         allowNull: true,
      });
   },

   async down(queryInterface) {
      queryInterface.removeColumn("Configs", "teste");
   },
};
