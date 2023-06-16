<?php

namespace Drupal\menu_migration\Form;

/**
 * Form used for exporting menu items.
 */
class MenuItemsExport extends MenuItemsFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'menu_migration_export';
  }

  /**
   * {@inheritdoc}
   */
  public function getActionType() {
    return self::MENU_EXPORT;
  }

}
