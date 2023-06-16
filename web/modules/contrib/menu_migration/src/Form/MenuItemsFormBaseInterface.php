<?php

namespace Drupal\menu_migration\Form;

/**
 * Interface for menu items form base.
 */
interface MenuItemsFormBaseInterface {

  const MENU_IMPORT = 'import';
  const MENU_EXPORT = 'export';

  /**
   * Gets the action type for menu migration. E.g. export, import etc.
   *
   * @return string
   *   Returns the action type.
   */
  public function getActionType();

}
