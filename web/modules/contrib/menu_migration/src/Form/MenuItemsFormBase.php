<?php

namespace Drupal\menu_migration\Form;

use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\menu_migration\Service\MenuMigrationService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Abstract form base for menu items migration operations.
 */
abstract class MenuItemsFormBase extends FormBase implements MenuItemsFormBaseInterface {

  /**
   * The menu migration service.
   *
   * @var \Drupal\menu_migration\Service\MenuMigrationService
   */
  protected MenuMigrationService $menuMigration;

  /**
   * The file system service.
   *
   * @var \Drupal\Core\File\FileSystemInterface
   */
  protected FileSystemInterface $fileSystem;

  /**
   * Constructs a new menu items operations form.
   *
   * @param \Drupal\menu_migration\Service\MenuMigrationService $menuMigrationService
   *   The menu migration service.
   */
  public function __construct(MenuMigrationService $menuMigrationService) {
    $this->menuMigration = $menuMigrationService;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('menu_migration.import_export'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {
    $menus = $this->menuMigration->getAvailableMenus();
    $form['menus'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Menus'),
      '#description' => $this->t('Select the menu(s) that you wish to @action', [
        '@action' => $this->getActionType(),
      ]),
      '#options' => $menus,
      '#required' => TRUE,
    ];

    $form['submit'] = [
      '#type' => 'submit',
      '#value' => ucfirst($this->getActionType()),
    ];

    if ($this->getActionType() === MenuItemsFormBaseInterface::MENU_IMPORT) {
      $form['submit']['#description'] = $this->t('Note that <strong>all existing menu link content items</strong> will be deleted before import.');
    }

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $result = [
      'success' => [],
      'failure' => [],
    ];
    $menus = array_filter($form_state->getValue('menus'), function ($item) {
      return !empty($item);
    });
    foreach ($menus as $menu) {
      switch ($this->getActionType()) {
        case self::MENU_EXPORT:
          if ($this->menuMigration->exportMenu($menu)) {
            $result['success'][] = $menu;
          }
          else {
            $result['failure'][] = $menu;
          }
          break;

        case self::MENU_IMPORT:
          if ($this->menuMigration->importMenu($menu)) {
            $result['success'][] = $menu;
          }
          else {
            $result['failure'][] = $menu;
          }
          break;
      }
    }

    if (!empty($result['success'])) {
      $this->messenger()->addStatus($this->t("Successfully @action the following menu(s): %menus", [
        '@action' => $this->getActionType() . 'ed',
        '%menus' => implode(',', $result['success']),
      ]));
    }
    if (!empty($result['failure'])) {
      $this->messenger()->addStatus($this->t("The following menus failed to @action: %menus. Please check the menu_migration folder and/or the logs.", [
        '@action' => $this->getActionType(),
        '%menus' => implode(',', $result['failure']),
      ]));
    }
  }

}
