<?php

namespace Drupal\menu_migration\Commands;

use Drupal\menu_migration\Service\MenuMigrationService;
use Drush\Commands\DrushCommands;

/**
 * Drush commands for the menu migration operations.
 */
class MenuMigrationCommands extends DrushCommands {

  /**
   * The menu migration service.
   *
   * @var \Drupal\menu_migration\Service\MenuMigrationService
   */
  protected MenuMigrationService $menuMigration;

  /**
   * Constructs a new menu migration drush command.
   *
   * @param \Drupal\menu_migration\Service\MenuMigrationService $menuMigrationService
   *   The menu migration service.
   */
  public function __construct(MenuMigrationService $menuMigrationService) {
    $this->menuMigration = $menuMigrationService;
  }

  /**
   * Exports one or more menu items.
   *
   * @param string $menu_names
   *   ID(s) of menu(s) to export. Delimit multiple using commas.
   *
   * @command menu_migration:export
   *
   * @usage menu_migration:export main
   *   Export one menu (in this case "main")
   * @usage menu_migration main,footer,some_name
   *   Export three menus (in this case "main", "footer" and "some_name")
   *
   * @validate-module-enabled menu_migration
   *
   * @aliases mme
   */
  public function export(string $menu_names = '') {
    $menus = explode(',', $menu_names);
    if (empty($menus)) {
      $this->output()->writeln('You must specify at least one menu to export.');
    }
    else {
      $availableMenus = $this->menuMigration->getAvailableMenus();
      foreach ($menus as $menu) {
        if (!isset($availableMenus[$menu])) {
          // @todo We might wanna throw some errors, but we do that later.
          $this->output()->writeln("The {$menu} menu does not exist. Skipping.");
        }
        elseif ($this->menuMigration->exportMenu($menu)) {
          $this->output()->writeln("Successfully exported {$menu} menu");

        }
        else {
          $this->output()->writeln("Could not export {$menu} menu");
        }
      }
    }
  }

  /**
   * Imports one or more menu items.
   *
   * @param string $menu_names
   *   ID(s) of menu(s) to import. Delimit multiple using commas.
   *
   * @command menu_migration:import
   *
   * @usage menu_migration:import main
   *   Import one menu (in this case "main")
   * @usage menu_migration main,footer,some_name
   *   Import three menus (in this case "main", "footer" and "some_name")
   *
   * @validate-module-enabled menu_migration
   *
   * @aliases mmi
   */
  public function import(string $menu_names = '') {
    $menus = explode(',', $menu_names);
    if (empty($menus)) {
      $this->output()->writeln('You must specify at least one menu to import.');
    }
    else {
      $availableMenus = $this->menuMigration->getAvailableMenus();
      foreach ($menus as $menu) {
        if (!isset($availableMenus[$menu])) {
          // @todo We might wanna throw some errors, but we do that later.
          $this->output()->writeln("The {$menu} menu does not exist. Skipping.");
        }
        elseif ($this->menuMigration->importMenu($menu)) {
          $this->output()->writeln("Successfully imported {$menu} menu");

        }
        else {
          $this->output()->writeln("Could not import {$menu} menu");
        }
      }
    }
  }

}
