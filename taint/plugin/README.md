# Taint Notifier ![notifier icon](./src/img/icon.png)

> A browser extension for Taintfox, that allows to examine websites for injection vulnerabilities

## 1. General

Taint Notifier is a browser extension for Taintfox, that allows to examine websites for injection vulnerabilities. The Tainfox browser is an adapted version of Firefox that enables the tracking of data flows within visited sites. Therefore string properties of the JavaScript and HTML context are extended to store so called taint information. This taint information contains the initial source as well as all function calls the string was passed to during the website execution. With this information the Taint Notifier is able to detect and validate potential vulnerabilities of the browsed websites and reports warnings to the user. By means of this reports e.g. DOM-based Cross-site Scripting flaws can be fixed by developers.

## 2. Development Mode

By using the following command:

    ```
    $ npm run dev
    ```

A new folder called dev will be generated. To test the extension:

    * Go to *about:debugging*, click on *This Taintfox*
    * Click on *Load Temporary Add-on*
    * Select *manifest.json* from the *dev* folder

## 7. Contact

- [Thomas Barber](mailto://thomas.barber@sap.com) - Team leader
- [Souphiane Bensalim](mailto://souphiane.bensalim@sap.com)
