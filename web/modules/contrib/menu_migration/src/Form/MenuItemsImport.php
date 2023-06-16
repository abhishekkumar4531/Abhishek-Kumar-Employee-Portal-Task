<?php

namespace Drupal\menu_migration\Form;

/**
 * Form used for importing menu items.
 */
class MenuItemsImport extends MenuItemsFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'menu_migration_import';
  }

  /**
   * {@inheritdoc}
   */
  public function getActionType() {
    return self::MENU_IMPORT;
  }

}
