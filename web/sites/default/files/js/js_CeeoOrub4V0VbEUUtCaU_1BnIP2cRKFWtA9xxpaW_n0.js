/**
 * @file
 * JavaScript behaviors for element (read) more.
 */

(function ($, Drupal, once) {

  'use strict';

  /**
   * Element (read) more.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.webformElementMore = {
    attach: function (context) {
      $(once('webform-element-more', '.js-webform-element-more', context)).each(function (event) {
        var $more = $(this);
        var $a = $more.find('a').first();
        var $content = $more.find('.webform-element-more--content');

        // Add aria-* attributes.
        $a.attr({
          'aria-expanded': false,
          'aria-controls': $content.attr('id')
        });

        // Add event handlers.
        $a.parent().on('click', toggle)
          .on('keydown', function (event) {
            // Space or Return.
            if (event.which === 32 || event.which === 13) {
              toggle(event);
            }
          });

        function toggle(event) {
          var expanded = ($a.attr('aria-expanded') === 'true');

          // Toggle `aria-expanded` attributes on link.
          $a.attr('aria-expanded', !expanded);

          // Toggle content and more .is-open state.
          if (expanded) {
            $more.removeClass('is-open');
            $content.slideUp();
          }
          else {
            $more.addClass('is-open');
            $content.slideDown();
          }

          event.preventDefault();
        }
      });
    }
  };

})(jQuery, Drupal, once);
;
/**
 * @file
 * Manages elements that can offset the size of the viewport.
 *
 * Measures and reports viewport offset dimensions from elements like the
 * toolbar that can potentially displace the positioning of other elements.
 */

/**
 * @typedef {object} Drupal~displaceOffset
 *
 * @prop {number} top
 * @prop {number} left
 * @prop {number} right
 * @prop {number} bottom
 */

/**
 * Triggers when layout of the page changes.
 *
 * This is used to position fixed element on the page during page resize and
 * Toolbar toggling.
 *
 * @event drupalViewportOffsetChange
 */
(function ($, Drupal, debounce) {
  /**
   *
   * @type {Drupal~displaceOffset}
   */
  const cache = {
    right: 0,
    left: 0,
    bottom: 0,
    top: 0,
  };
  /**
   * The prefix used for the css custom variable name.
   *
   * @type {string}
   */
  const cssVarPrefix = '--drupal-displace-offset';
  const documentStyle = document.documentElement.style;
  const offsetKeys = Object.keys(cache);
  /**
   * The object with accessors that update the CSS variable on value update.
   *
   * @type {Drupal~displaceOffset}
   */
  const offsetProps = {};
  offsetKeys.forEach((edge) => {
    offsetProps[edge] = {
      // Show this property when using Object.keys().
      enumerable: true,
      get() {
        return cache[edge];
      },
      set(value) {
        // Only update the CSS custom variable when the value changed.
        if (value !== cache[edge]) {
          documentStyle.setProperty(`${cssVarPrefix}-${edge}`, `${value}px`);
        }
        cache[edge] = value;
      },
    };
  });

  /**
   * Current value of the size of margins on the page.
   *
   * This property is read-only and the object is sealed to prevent key name
   * modifications since key names are used to dynamically construct CSS custom
   * variable names.
   *
   * @name Drupal.displace.offsets
   *
   * @type {Drupal~displaceOffset}
   */
  const offsets = Object.seal(Object.defineProperties({}, offsetProps));

  /**
   * Calculates displacement for element based on its dimensions and placement.
   *
   * @param {HTMLElement} el
   *   The element whose dimensions and placement will be measured.
   *
   * @param {string} edge
   *   The name of the edge of the viewport that the element is associated
   *   with.
   *
   * @return {number}
   *   The viewport displacement distance for the requested edge.
   */
  function getRawOffset(el, edge) {
    const $el = $(el);
    const documentElement = document.documentElement;
    let displacement = 0;
    const horizontal = edge === 'left' || edge === 'right';
    // Get the offset of the element itself.
    let placement = $el.offset()[horizontal ? 'left' : 'top'];
    // Subtract scroll distance from placement to get the distance
    // to the edge of the viewport.
    placement -=
      window[`scroll${horizontal ? 'X' : 'Y'}`] ||
      document.documentElement[`scroll${horizontal ? 'Left' : 'Top'}`] ||
      0;
    // Find the displacement value according to the edge.
    switch (edge) {
      // Left and top elements displace as a sum of their own offset value
      // plus their size.
      case 'top':
        // Total displacement is the sum of the elements placement and size.
        displacement = placement + $el.outerHeight();
        break;

      case 'left':
        // Total displacement is the sum of the elements placement and size.
        displacement = placement + $el.outerWidth();
        break;

      // Right and bottom elements displace according to their left and
      // top offset. Their size isn't important.
      case 'bottom':
        displacement = documentElement.clientHeight - placement;
        break;

      case 'right':
        displacement = documentElement.clientWidth - placement;
        break;

      default:
        displacement = 0;
    }
    return displacement;
  }

  /**
   * Gets a specific edge's offset.
   *
   * Any element with the attribute data-offset-{edge} e.g. data-offset-top will
   * be considered in the viewport offset calculations. If the attribute has a
   * numeric value, that value will be used. If no value is provided, one will
   * be calculated using the element's dimensions and placement.
   *
   * @function Drupal.displace.calculateOffset
   *
   * @param {string} edge
   *   The name of the edge to calculate. Can be 'top', 'right',
   *   'bottom' or 'left'.
   *
   * @return {number}
   *   The viewport displacement distance for the requested edge.
   */
  function calculateOffset(edge) {
    let edgeOffset = 0;
    const displacingElements = document.querySelectorAll(
      `[data-offset-${edge}]`,
    );
    const n = displacingElements.length;
    for (let i = 0; i < n; i++) {
      const el = displacingElements[i];
      // If the element is not visible, do consider its dimensions.
      if (el.style.display === 'none') {
        continue;
      }
      // If the offset data attribute contains a displacing value, use it.
      let displacement = parseInt(el.getAttribute(`data-offset-${edge}`), 10);
      // If the element's offset data attribute exits
      // but is not a valid number then get the displacement
      // dimensions directly from the element.
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(displacement)) {
        displacement = getRawOffset(el, edge);
      }
      // If the displacement value is larger than the current value for this
      // edge, use the displacement value.
      edgeOffset = Math.max(edgeOffset, displacement);
    }

    return edgeOffset;
  }

  /**
   * Informs listeners of the current offset dimensions.
   *
   * Corresponding CSS custom variables are also updated.
   * Corresponding CSS custom variables names are:
   *  - `--drupal-displace-offset-top`
   *  - `--drupal-displace-offset-right`
   *  - `--drupal-displace-offset-bottom`
   *  - `--drupal-displace-offset-left`
   *
   * @function Drupal.displace
   *
   * @prop {Drupal~displaceOffset} offsets
   *
   * @param {boolean} [broadcast=true]
   *   When true, causes the recalculated offsets values to be
   *   broadcast to listeners. If none is given, defaults to true.
   *
   * @return {Drupal~displaceOffset}
   *   An object whose keys are the for sides an element -- top, right, bottom
   *   and left. The value of each key is the viewport displacement distance for
   *   that edge.
   *
   * @fires event:drupalViewportOffsetChange
   */
  function displace(broadcast = true) {
    const newOffsets = {};
    // Getting the offset and setting the offset needs to be separated because
    // of performance concerns. Only do DOM/style reading happening here.
    offsetKeys.forEach((edge) => {
      newOffsets[edge] = calculateOffset(edge);
    });
    // Once we have all the values, write to the DOM/style.
    offsetKeys.forEach((edge) => {
      // Updating the value in place also update Drupal.displace.offsets.
      offsets[edge] = newOffsets[edge];
    });

    if (broadcast) {
      $(document).trigger('drupalViewportOffsetChange', offsets);
    }
    return offsets;
  }

  /**
   * Registers a resize handler on the window.
   *
   * @type {Drupal~behavior}
   */
  Drupal.behaviors.drupalDisplace = {
    attach() {
      // Mark this behavior as processed on the first pass.
      if (this.displaceProcessed) {
        return;
      }
      this.displaceProcessed = true;
      $(window).on('resize.drupalDisplace', debounce(displace, 200));
    },
  };

  /**
   * Assign the displace function to a property of the Drupal global object.
   *
   * @ignore
   */
  Drupal.displace = displace;

  /**
   * Expose offsets to other scripts to avoid having to recalculate offsets.
   *
   * @ignore
   */
  Object.defineProperty(Drupal.displace, 'offsets', {
    value: offsets,
    // Make sure other scripts don't replace this object.
    writable: false,
  });

  /**
   * Expose method to compute a single edge offsets.
   *
   * @ignore
   */
  Drupal.displace.calculateOffset = calculateOffset;
})(jQuery, Drupal, Drupal.debounce);
;
/**
 * @file
 * Dialog API inspired by HTML5 dialog element.
 *
 * @see http://www.whatwg.org/specs/web-apps/current-work/multipage/commands.html#the-dialog-element
 */

(function ($, Drupal, drupalSettings) {
  /**
   * Default dialog options.
   *
   * @type {object}
   *
   * @prop {boolean} [autoOpen=true]
   * @prop {string} [dialogClass='']
   * @prop {string} [buttonClass='button']
   * @prop {string} [buttonPrimaryClass='button--primary']
   * @prop {function} close
   */
  drupalSettings.dialog = {
    autoOpen: true,
    dialogClass: '',
    // Drupal-specific extensions: see dialog.jquery-ui.js.
    buttonClass: 'button',
    buttonPrimaryClass: 'button--primary',
    // When using this API directly (when generating dialogs on the client
    // side), you may want to override this method and do
    // `jQuery(event.target).remove()` as well, to remove the dialog on
    // closing.
    close(event) {
      Drupal.dialog(event.target).close();
      Drupal.detachBehaviors(event.target, null, 'unload');
    },
  };

  /**
   * @typedef {object} Drupal.dialog~dialogDefinition
   *
   * @prop {boolean} open
   *   Is the dialog open or not.
   * @prop {*} returnValue
   *   Return value of the dialog.
   * @prop {function} show
   *   Method to display the dialog on the page.
   * @prop {function} showModal
   *   Method to display the dialog as a modal on the page.
   * @prop {function} close
   *   Method to hide the dialog from the page.
   */

  /**
   * Polyfill HTML5 dialog element with jQueryUI.
   *
   * @param {HTMLElement} element
   *   The element that holds the dialog.
   * @param {object} options
   *   jQuery UI options to be passed to the dialog.
   *
   * @return {Drupal.dialog~dialogDefinition}
   *   The dialog instance.
   */
  Drupal.dialog = function (element, options) {
    let undef;
    const $element = $(element);
    const dialog = {
      open: false,
      returnValue: undef,
    };

    function openDialog(settings) {
      settings = $.extend({}, drupalSettings.dialog, options, settings);
      // Trigger a global event to allow scripts to bind events to the dialog.
      $(window).trigger('dialog:beforecreate', [dialog, $element, settings]);
      $element.dialog(settings);
      dialog.open = true;
      $(window).trigger('dialog:aftercreate', [dialog, $element, settings]);
    }

    function closeDialog(value) {
      $(window).trigger('dialog:beforeclose', [dialog, $element]);
      $element.dialog('close');
      dialog.returnValue = value;
      dialog.open = false;
      $(window).trigger('dialog:afterclose', [dialog, $element]);
    }

    dialog.show = () => {
      openDialog({ modal: false });
    };
    dialog.showModal = () => {
      openDialog({ modal: true });
    };
    dialog.close = closeDialog;

    return dialog;
  };
})(jQuery, Drupal, drupalSettings);
;
/**
 * @file
 * Positioning extensions for dialogs.
 */

/**
 * Triggers when content inside a dialog changes.
 *
 * @event dialogContentResize
 */

(function ($, Drupal, drupalSettings, debounce, displace) {
  // autoResize option will turn off resizable and draggable.
  drupalSettings.dialog = $.extend(
    { autoResize: true, maxHeight: '95%' },
    drupalSettings.dialog,
  );

  /**
   * Position the dialog's center at the center of displace.offsets boundaries.
   *
   * @function Drupal.dialog~resetPosition
   *
   * @param {object} options
   *   Options object.
   *
   * @return {object}
   *   Altered options object.
   */
  function resetPosition(options) {
    const offsets = displace.offsets;
    const left = offsets.left - offsets.right;
    const top = offsets.top - offsets.bottom;

    const leftString = `${
      (left > 0 ? '+' : '-') + Math.abs(Math.round(left / 2))
    }px`;
    const topString = `${
      (top > 0 ? '+' : '-') + Math.abs(Math.round(top / 2))
    }px`;
    options.position = {
      my: `center${left !== 0 ? leftString : ''} center${
        top !== 0 ? topString : ''
      }`,
      of: window,
    };
    return options;
  }

  /**
   * Resets the current options for positioning.
   *
   * This is used as a window resize and scroll callback to reposition the
   * jQuery UI dialog. Although not a built-in jQuery UI option, this can
   * be disabled by setting autoResize: false in the options array when creating
   * a new {@link Drupal.dialog}.
   *
   * @function Drupal.dialog~resetSize
   *
   * @param {jQuery.Event} event
   *   The event triggered.
   *
   * @fires event:dialogContentResize
   */
  function resetSize(event) {
    const positionOptions = [
      'width',
      'height',
      'minWidth',
      'minHeight',
      'maxHeight',
      'maxWidth',
      'position',
    ];
    let adjustedOptions = {};
    let windowHeight = $(window).height();
    let option;
    let optionValue;
    let adjustedValue;
    for (let n = 0; n < positionOptions.length; n++) {
      option = positionOptions[n];
      optionValue = event.data.settings[option];
      if (optionValue) {
        // jQuery UI does not support percentages on heights, convert to pixels.
        if (
          typeof optionValue === 'string' &&
          /%$/.test(optionValue) &&
          /height/i.test(option)
        ) {
          // Take offsets in account.
          windowHeight -= displace.offsets.top + displace.offsets.bottom;
          adjustedValue = parseInt(
            0.01 * parseInt(optionValue, 10) * windowHeight,
            10,
          );
          // Don't force the dialog to be bigger vertically than needed.
          if (
            option === 'height' &&
            event.data.$element.parent().outerHeight() < adjustedValue
          ) {
            adjustedValue = 'auto';
          }
          adjustedOptions[option] = adjustedValue;
        }
      }
    }
    // Offset the dialog center to be at the center of Drupal.displace.offsets.
    if (!event.data.settings.modal) {
      adjustedOptions = resetPosition(adjustedOptions);
    }
    event.data.$element
      .dialog('option', adjustedOptions)
      .trigger('dialogContentResize');
  }

  $(window).on({
    'dialog:aftercreate': function (event, dialog, $element, settings) {
      const autoResize = debounce(resetSize, 20);
      const eventData = { settings, $element };
      if (settings.autoResize === true || settings.autoResize === 'true') {
        $element
          .dialog('option', { resizable: false, draggable: false })
          .dialog('widget')
          .css('position', 'fixed');
        $(window)
          .on('resize.dialogResize scroll.dialogResize', eventData, autoResize)
          .trigger('resize.dialogResize');
        $(document).on(
          'drupalViewportOffsetChange.dialogResize',
          eventData,
          autoResize,
        );
      }
    },
    'dialog:beforeclose': function (event, dialog, $element) {
      $(window).off('.dialogResize');
      $(document).off('.dialogResize');
    },
  });
})(jQuery, Drupal, drupalSettings, Drupal.debounce, Drupal.displace);
;
/**
 * @file
 * Adds default classes to buttons for styling purposes.
 */

(function ($, { tabbable, isTabbable }) {
  $.widget('ui.dialog', $.ui.dialog, {
    options: {
      buttonClass: 'button',
      buttonPrimaryClass: 'button--primary',
    },
    _createButtons() {
      const opts = this.options;
      let primaryIndex;
      let index;
      const il = opts.buttons.length;
      for (index = 0; index < il; index++) {
        if (
          opts.buttons[index].primary &&
          opts.buttons[index].primary === true
        ) {
          primaryIndex = index;
          delete opts.buttons[index].primary;
          break;
        }
      }
      this._super();
      const $buttons = this.uiButtonSet.children().addClass(opts.buttonClass);
      if (typeof primaryIndex !== 'undefined') {
        $buttons.eq(index).addClass(opts.buttonPrimaryClass);
      }
    },
    // Override jQuery UI's `_focusTabbable()` so finding tabbable elements uses
    // the core/tabbable library instead of jQuery UI's `:tabbable` selector.
    _focusTabbable() {
      // Set focus to the first match:

      // 1. An element that was focused previously.
      let hasFocus = this._focusedElement ? this._focusedElement.get(0) : null;

      // 2. First element inside the dialog matching [autofocus].
      if (!hasFocus) {
        hasFocus = this.element.find('[autofocus]').get(0);
      }

      // 3. Tabbable element inside the content element.
      // 4. Tabbable element inside the buttonpane.
      if (!hasFocus) {
        const $elements = [this.element, this.uiDialogButtonPane];
        for (let i = 0; i < $elements.length; i++) {
          const element = $elements[i].get(0);
          if (element) {
            const elementTabbable = tabbable(element);
            hasFocus = elementTabbable.length ? elementTabbable[0] : null;
          }
          if (hasFocus) {
            break;
          }
        }
      }

      // 5. The close button.
      if (!hasFocus) {
        const closeBtn = this.uiDialogTitlebarClose.get(0);
        hasFocus = closeBtn && isTabbable(closeBtn) ? closeBtn : null;
      }

      // 6. The dialog itself.
      if (!hasFocus) {
        hasFocus = this.uiDialog.get(0);
      }
      $(hasFocus).eq(0).trigger('focus');
    },
  });
})(jQuery, window.tabbable);
;
/**
 * @file
 * This file overrides the way jQuery UI focus trap works.
 *
 * When a focus event is fired while a CKEditor 5 instance is focused, do not
 * trap the focus and let CKEditor 5 manage that focus.
 */

(($) => {
  $.widget('ui.dialog', $.ui.dialog, {
    // Override core override of jQuery UI's `_allowInteraction()` so that
    // CKEditor 5 in modals can work as expected.
    // @see https://api.jqueryui.com/dialog/#method-_allowInteraction
    _allowInteraction(event) {
      return event.target.classList.contains('ck') || this._super(event);
    },
  });
})(jQuery);
;
/**
 * @file
 * Extends the Drupal AJAX functionality to integrate the dialog API.
 */

(function ($, Drupal) {
  /**
   * Initialize dialogs for Ajax purposes.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches the behaviors for dialog ajax functionality.
   */
  Drupal.behaviors.dialog = {
    attach(context, settings) {
      const $context = $(context);

      // Provide a known 'drupal-modal' DOM element for Drupal-based modal
      // dialogs. Non-modal dialogs are responsible for creating their own
      // elements, since there can be multiple non-modal dialogs at a time.
      if (!$('#drupal-modal').length) {
        // Add 'ui-front' jQuery UI class so jQuery UI widgets like autocomplete
        // sit on top of dialogs. For more information see
        // http://api.jqueryui.com/theming/stacking-elements/.
        $('<div id="drupal-modal" class="ui-front"></div>')
          .hide()
          .appendTo('body');
      }

      // Special behaviors specific when attaching content within a dialog.
      // These behaviors usually fire after a validation error inside a dialog.
      const $dialog = $context.closest('.ui-dialog-content');
      if ($dialog.length) {
        // Remove and replace the dialog buttons with those from the new form.
        if ($dialog.dialog('option', 'drupalAutoButtons')) {
          // Trigger an event to detect/sync changes to buttons.
          $dialog.trigger('dialogButtonsChange');
        }

        // Force focus on the modal when the behavior is run.
        $dialog.dialog('widget').trigger('focus');
      }

      const originalClose = settings.dialog.close;
      // Overwrite the close method to remove the dialog on closing.
      settings.dialog.close = function (event, ...args) {
        originalClose.apply(settings.dialog, [event, ...args]);
        $(event.target).remove();
      };
    },

    /**
     * Scan a dialog for any primary buttons and move them to the button area.
     *
     * @param {jQuery} $dialog
     *   A jQuery object containing the element that is the dialog target.
     *
     * @return {Array}
     *   An array of buttons that need to be added to the button area.
     */
    prepareDialogButtons($dialog) {
      const buttons = [];
      const $buttons = $dialog.find(
        '.form-actions input[type=submit], .form-actions a.button',
      );
      $buttons.each(function () {
        const $originalButton = $(this).css({ display: 'none' });
        buttons.push({
          text: $originalButton.html() || $originalButton.attr('value'),
          class: $originalButton.attr('class'),
          click(e) {
            // If the original button is an anchor tag, triggering the "click"
            // event will not simulate a click. Use the click method instead.
            if ($originalButton.is('a')) {
              $originalButton[0].click();
            } else {
              $originalButton
                .trigger('mousedown')
                .trigger('mouseup')
                .trigger('click');
              e.preventDefault();
            }
          },
        });
      });
      return buttons;
    },
  };

  /**
   * Command to open a dialog.
   *
   * @param {Drupal.Ajax} ajax
   *   The Drupal Ajax object.
   * @param {object} response
   *   Object holding the server response.
   * @param {number} [status]
   *   The HTTP status code.
   *
   * @return {boolean|undefined}
   *   Returns false if there was no selector property in the response object.
   */
  Drupal.AjaxCommands.prototype.openDialog = function (ajax, response, status) {
    if (!response.selector) {
      return false;
    }
    let $dialog = $(response.selector);
    if (!$dialog.length) {
      // Create the element if needed.
      $dialog = $(
        `<div id="${response.selector.replace(
          /^#/,
          '',
        )}" class="ui-front"></div>`,
      ).appendTo('body');
    }
    // Set up the wrapper, if there isn't one.
    if (!ajax.wrapper) {
      ajax.wrapper = $dialog.attr('id');
    }

    // Use the ajax.js insert command to populate the dialog contents.
    response.command = 'insert';
    response.method = 'html';
    ajax.commands.insert(ajax, response, status);

    // Move the buttons to the jQuery UI dialog buttons area.
    if (!response.dialogOptions.buttons) {
      response.dialogOptions.drupalAutoButtons = true;
      response.dialogOptions.buttons =
        Drupal.behaviors.dialog.prepareDialogButtons($dialog);
    }

    // Bind dialogButtonsChange.
    $dialog.on('dialogButtonsChange', () => {
      const buttons = Drupal.behaviors.dialog.prepareDialogButtons($dialog);
      $dialog.dialog('option', 'buttons', buttons);
    });

    // Open the dialog itself.
    response.dialogOptions = response.dialogOptions || {};
    const dialog = Drupal.dialog($dialog.get(0), response.dialogOptions);
    if (response.dialogOptions.modal) {
      dialog.showModal();
    } else {
      dialog.show();
    }

    // Add the standard Drupal class for buttons for style consistency.
    $dialog.parent().find('.ui-dialog-buttonset').addClass('form-actions');
  };

  /**
   * Command to close a dialog.
   *
   * If no selector is given, it defaults to trying to close the modal.
   *
   * @param {Drupal.Ajax} [ajax]
   *   The ajax object.
   * @param {object} response
   *   Object holding the server response.
   * @param {string} response.selector
   *   The selector of the dialog.
   * @param {boolean} response.persist
   *   Whether to persist the dialog element or not.
   * @param {number} [status]
   *   The HTTP status code.
   */
  Drupal.AjaxCommands.prototype.closeDialog = function (
    ajax,
    response,
    status,
  ) {
    const $dialog = $(response.selector);
    if ($dialog.length) {
      Drupal.dialog($dialog.get(0)).close();
      if (!response.persist) {
        $dialog.remove();
      }
    }

    // Unbind dialogButtonsChange.
    $dialog.off('dialogButtonsChange');
  };

  /**
   * Command to set a dialog property.
   *
   * JQuery UI specific way of setting dialog options.
   *
   * @param {Drupal.Ajax} [ajax]
   *   The Drupal Ajax object.
   * @param {object} response
   *   Object holding the server response.
   * @param {string} response.selector
   *   Selector for the dialog element.
   * @param {string} response.optionsName
   *   Name of a key to set.
   * @param {string} response.optionValue
   *   Value to set.
   * @param {number} [status]
   *   The HTTP status code.
   */
  Drupal.AjaxCommands.prototype.setDialogOption = function (
    ajax,
    response,
    status,
  ) {
    const $dialog = $(response.selector);
    if ($dialog.length) {
      $dialog.dialog('option', response.optionName, response.optionValue);
    }
  };

  /**
   * Binds a listener on dialog creation to handle the cancel link.
   *
   * @param {jQuery.Event} e
   *   The event triggered.
   * @param {Drupal.dialog~dialogDefinition} dialog
   *   The dialog instance.
   * @param {jQuery} $element
   *   The jQuery collection of the dialog element.
   * @param {object} [settings]
   *   Dialog settings.
   */
  $(window).on('dialog:aftercreate', (e, dialog, $element, settings) => {
    $element.on('click.dialog', '.dialog-cancel', (e) => {
      dialog.close('cancel');
      e.preventDefault();
      e.stopPropagation();
    });
  });

  /**
   * Removes all 'dialog' listeners.
   *
   * @param {jQuery.Event} e
   *   The event triggered.
   * @param {Drupal.dialog~dialogDefinition} dialog
   *   The dialog instance.
   * @param {jQuery} $element
   *   jQuery collection of the dialog element.
   */
  $(window).on('dialog:beforeclose', (e, dialog, $element) => {
    $element.off('.dialog');
  });
})(jQuery, Drupal);
;
/*
 * jQuery treetable Plugin 3.2.0
 * http://ludo.cubicphuse.nl/jquery-treetable
 *
 * Copyright 2013, Ludo van den Boom
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */
(function($) {
  var Node, Tree, methods;

  Node = (function() {
    function Node(row, tree, settings) {
      var parentId;

      this.row = row;
      this.tree = tree;
      this.settings = settings;

      // TODO Ensure id/parentId is always a string (not int)
      this.id = this.row.data(this.settings.nodeIdAttr);

      // TODO Move this to a setParentId function?
      parentId = this.row.data(this.settings.parentIdAttr);
      if (parentId != null && parentId !== "") {
        this.parentId = parentId;
      }

      this.treeCell = $(this.row.children(this.settings.columnElType)[this.settings.column]);
      this.expander = $(this.settings.expanderTemplate);
      this.indenter = $(this.settings.indenterTemplate);
      this.children = [];
      this.initialized = false;
      this.treeCell.prepend(this.indenter);
    }

    Node.prototype.addChild = function(child) {
      return this.children.push(child);
    };

    Node.prototype.ancestors = function() {
      var ancestors, node;
      node = this;
      ancestors = [];
      while (node = node.parentNode()) {
        ancestors.push(node);
      }
      return ancestors;
    };

    Node.prototype.collapse = function() {
      if (this.collapsed()) {
        return this;
      }

      this.row.removeClass("expanded").addClass("collapsed");

      this._hideChildren();
      this.expander.attr("title", this.settings.stringExpand);

      if (this.initialized && this.settings.onNodeCollapse != null) {
        this.settings.onNodeCollapse.apply(this);
      }

      return this;
    };

    Node.prototype.collapsed = function() {
      return this.row.hasClass("collapsed");
    };

    // TODO destroy: remove event handlers, expander, indenter, etc.

    Node.prototype.expand = function() {
      if (this.expanded()) {
        return this;
      }

      this.row.removeClass("collapsed").addClass("expanded");

      if (this.initialized && this.settings.onNodeExpand != null) {
        this.settings.onNodeExpand.apply(this);
      }

      if ($(this.row).is(":visible")) {
        this._showChildren();
      }

      this.expander.attr("title", this.settings.stringCollapse);

      return this;
    };

    Node.prototype.expanded = function() {
      return this.row.hasClass("expanded");
    };

    Node.prototype.hide = function() {
      this._hideChildren();
      this.row.hide();
      return this;
    };

    Node.prototype.isBranchNode = function() {
      if(this.children.length > 0 || this.row.data(this.settings.branchAttr) === true) {
        return true;
      } else {
        return false;
      }
    };

    Node.prototype.updateBranchLeafClass = function(){
      this.row.removeClass('branch');
      this.row.removeClass('leaf');
      this.row.addClass(this.isBranchNode() ? 'branch' : 'leaf');
    };

    Node.prototype.level = function() {
      return this.ancestors().length;
    };

    Node.prototype.parentNode = function() {
      if (this.parentId != null) {
        return this.tree[this.parentId];
      } else {
        return null;
      }
    };

    Node.prototype.removeChild = function(child) {
      var i = $.inArray(child, this.children);
      return this.children.splice(i, 1)
    };

    Node.prototype.render = function() {
      var handler,
          settings = this.settings,
          target;

      if (settings.expandable === true && this.isBranchNode()) {
        handler = function(e) {
          $(this).parents("table").treetable("node", $(this).parents("tr").data(settings.nodeIdAttr)).toggle();
          return e.preventDefault();
        };

        this.indenter.html(this.expander);
        target = settings.clickableNodeNames === true ? this.treeCell : this.expander;

        target.off("click.treetable").on("click.treetable", handler);
        target.off("keydown.treetable").on("keydown.treetable", function(e) {
          if (e.keyCode == 13) {
            handler.apply(this, [e]);
          }
        });
      }

      this.indenter[0].style.paddingLeft = "" + (this.level() * settings.indent) + "px";

      return this;
    };

    Node.prototype.reveal = function() {
      if (this.parentId != null) {
        this.parentNode().reveal();
      }
      return this.expand();
    };

    Node.prototype.setParent = function(node) {
      if (this.parentId != null) {
        this.tree[this.parentId].removeChild(this);
      }
      this.parentId = node.id;
      this.row.data(this.settings.parentIdAttr, node.id);
      return node.addChild(this);
    };

    Node.prototype.show = function() {
      if (!this.initialized) {
        this._initialize();
      }
      this.row.show();
      if (this.expanded()) {
        this._showChildren();
      }
      return this;
    };

    Node.prototype.toggle = function() {
      if (this.expanded()) {
        this.collapse();
      } else {
        this.expand();
      }
      return this;
    };

    Node.prototype._hideChildren = function() {
      var child, _i, _len, _ref, _results;
      _ref = this.children;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        _results.push(child.hide());
      }
      return _results;
    };

    Node.prototype._initialize = function() {
      var settings = this.settings;

      this.render();

      if (settings.expandable === true && settings.initialState === "collapsed") {
        this.collapse();
      } else {
        this.expand();
      }

      if (settings.onNodeInitialized != null) {
        settings.onNodeInitialized.apply(this);
      }

      return this.initialized = true;
    };

    Node.prototype._showChildren = function() {
      var child, _i, _len, _ref, _results;
      _ref = this.children;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        _results.push(child.show());
      }
      return _results;
    };

    return Node;
  })();

  Tree = (function() {
    function Tree(table, settings) {
      this.table = table;
      this.settings = settings;
      this.tree = {};

      // Cache the nodes and roots in simple arrays for quick access/iteration
      this.nodes = [];
      this.roots = [];
    }

    Tree.prototype.collapseAll = function() {
      var node, _i, _len, _ref, _results;
      _ref = this.nodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.collapse());
      }
      return _results;
    };

    Tree.prototype.expandAll = function() {
      var node, _i, _len, _ref, _results;
      _ref = this.nodes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.expand());
      }
      return _results;
    };

    Tree.prototype.findLastNode = function (node) {
      if (node.children.length > 0) {
        return this.findLastNode(node.children[node.children.length - 1]);
      } else {
        return node;
      }
    };

    Tree.prototype.loadRows = function(rows) {
      var node, row, i;

      if (rows != null) {
        for (i = 0; i < rows.length; i++) {
          row = $(rows[i]);

          if (row.data(this.settings.nodeIdAttr) != null) {
            node = new Node(row, this.tree, this.settings);
            this.nodes.push(node);
            this.tree[node.id] = node;

            if (node.parentId != null && this.tree[node.parentId]) {
              this.tree[node.parentId].addChild(node);
            } else {
              this.roots.push(node);
            }
          }
        }
      }

      for (i = 0; i < this.nodes.length; i++) {
        node = this.nodes[i].updateBranchLeafClass();
      }

      return this;
    };

    Tree.prototype.move = function(node, destination) {
      // Conditions:
      // 1: +node+ should not be inserted as a child of +node+ itself.
      // 2: +destination+ should not be the same as +node+'s current parent (this
      //    prevents +node+ from being moved to the same location where it already
      //    is).
      // 3: +node+ should not be inserted in a location in a branch if this would
      //    result in +node+ being an ancestor of itself.
      var nodeParent = node.parentNode();
      if (node !== destination && destination.id !== node.parentId && $.inArray(node, destination.ancestors()) === -1) {
        node.setParent(destination);
        this._moveRows(node, destination);

        // Re-render parentNode if this is its first child node, and therefore
        // doesn't have the expander yet.
        if (node.parentNode().children.length === 1) {
          node.parentNode().render();
        }
      }

      if(nodeParent){
        nodeParent.updateBranchLeafClass();
      }
      if(node.parentNode()){
        node.parentNode().updateBranchLeafClass();
      }
      node.updateBranchLeafClass();
      return this;
    };

    Tree.prototype.removeNode = function(node) {
      // Recursively remove all descendants of +node+
      this.unloadBranch(node);

      // Remove node from DOM (<tr>)
      node.row.remove();

      // Remove node from parent children list
      if (node.parentId != null) {
        node.parentNode().removeChild(node);
      }

      // Clean up Tree object (so Node objects are GC-ed)
      delete this.tree[node.id];
      this.nodes.splice($.inArray(node, this.nodes), 1);

      return this;
    }

    Tree.prototype.render = function() {
      var root, _i, _len, _ref;
      _ref = this.roots;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        root = _ref[_i];

        // Naming is confusing (show/render). I do not call render on node from
        // here.
        root.show();
      }
      return this;
    };

    Tree.prototype.sortBranch = function(node, sortFun) {
      // First sort internal array of children
      node.children.sort(sortFun);

      // Next render rows in correct order on page
      this._sortChildRows(node);

      return this;
    };

    Tree.prototype.unloadBranch = function(node) {
      // Use a copy of the children array to not have other functions interfere
      // with this function if they manipulate the children array
      // (eg removeNode).
      var children = node.children.slice(0),
          i;

      for (i = 0; i < children.length; i++) {
        this.removeNode(children[i]);
      }

      // Reset node's collection of children
      node.children = [];

      node.updateBranchLeafClass();

      return this;
    };

    Tree.prototype._moveRows = function(node, destination) {
      var children = node.children, i;

      node.row.insertAfter(destination.row);
      node.render();

      // Loop backwards through children to have them end up on UI in correct
      // order (see #112)
      for (i = children.length - 1; i >= 0; i--) {
        this._moveRows(children[i], node);
      }
    };

    // Special _moveRows case, move children to itself to force sorting
    Tree.prototype._sortChildRows = function(parentNode) {
      return this._moveRows(parentNode, parentNode);
    };

    return Tree;
  })();

  // jQuery Plugin
  methods = {
    init: function(options, force) {
      var settings;

      settings = $.extend({
        branchAttr: "ttBranch",
        clickableNodeNames: false,
        column: 0,
        columnElType: "td", // i.e. 'td', 'th' or 'td,th'
        expandable: false,
        expanderTemplate: "<a href='#'>&nbsp;</a>",
        indent: 19,
        indenterTemplate: "<span class='indenter'></span>",
        initialState: "collapsed",
        nodeIdAttr: "ttId", // maps to data-tt-id
        parentIdAttr: "ttParentId", // maps to data-tt-parent-id
        stringExpand: "Expand",
        stringCollapse: "Collapse",

        // Events
        onInitialized: null,
        onNodeCollapse: null,
        onNodeExpand: null,
        onNodeInitialized: null
      }, options);

      return this.each(function() {
        var el = $(this), tree;

        if (force || el.data("treetable") === undefined) {
          tree = new Tree(this, settings);
          tree.loadRows(this.rows).render();

          el.addClass("treetable").data("treetable", tree);

          if (settings.onInitialized != null) {
            settings.onInitialized.apply(tree);
          }
        }

        return el;
      });
    },

    destroy: function() {
      return this.each(function() {
        return $(this).removeData("treetable").removeClass("treetable");
      });
    },

    collapseAll: function() {
      this.data("treetable").collapseAll();
      return this;
    },

    collapseNode: function(id) {
      var node = this.data("treetable").tree[id];

      if (node) {
        node.collapse();
      } else {
        throw new Error("Unknown node '" + id + "'");
      }

      return this;
    },

    expandAll: function() {
      this.data("treetable").expandAll();
      return this;
    },

    expandNode: function(id) {
      var node = this.data("treetable").tree[id];

      if (node) {
        if (!node.initialized) {
          node._initialize();
        }

        node.expand();
      } else {
        throw new Error("Unknown node '" + id + "'");
      }

      return this;
    },

    loadBranch: function(node, rows) {
      var settings = this.data("treetable").settings,
          tree = this.data("treetable").tree;

      // TODO Switch to $.parseHTML
      rows = $(rows);

      if (node == null) { // Inserting new root nodes
        this.append(rows);
      } else {
        var lastNode = this.data("treetable").findLastNode(node);
        rows.insertAfter(lastNode.row);
      }

      this.data("treetable").loadRows(rows);

      // Make sure nodes are properly initialized
      rows.filter("tr").each(function() {
        tree[$(this).data(settings.nodeIdAttr)].show();
      });

      if (node != null) {
        // Re-render parent to ensure expander icon is shown (#79)
        node.render().expand();
      }

      return this;
    },

    move: function(nodeId, destinationId) {
      var destination, node;

      node = this.data("treetable").tree[nodeId];
      destination = this.data("treetable").tree[destinationId];
      this.data("treetable").move(node, destination);

      return this;
    },

    node: function(id) {
      return this.data("treetable").tree[id];
    },

    removeNode: function(id) {
      var node = this.data("treetable").tree[id];

      if (node) {
        this.data("treetable").removeNode(node);
      } else {
        throw new Error("Unknown node '" + id + "'");
      }

      return this;
    },

    reveal: function(id) {
      var node = this.data("treetable").tree[id];

      if (node) {
        node.reveal();
      } else {
        throw new Error("Unknown node '" + id + "'");
      }

      return this;
    },

    sortBranch: function(node, columnOrFunction) {
      var settings = this.data("treetable").settings,
          prepValue,
          sortFun;

      columnOrFunction = columnOrFunction || settings.column;
      sortFun = columnOrFunction;

      if ($.isNumeric(columnOrFunction)) {
        sortFun = function(a, b) {
          var extractValue, valA, valB;

          extractValue = function(node) {
            var val = node.row.find("td:eq(" + columnOrFunction + ")").text();
            // Ignore trailing/leading whitespace and use uppercase values for
            // case insensitive ordering
            return $.trim(val).toUpperCase();
          }

          valA = extractValue(a);
          valB = extractValue(b);

          if (valA < valB) return -1;
          if (valA > valB) return 1;
          return 0;
        };
      }

      this.data("treetable").sortBranch(node, sortFun);
      return this;
    },

    unloadBranch: function(node) {
      this.data("treetable").unloadBranch(node);
      return this;
    }
  };

  $.fn.treetable = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      return $.error("Method " + method + " does not exist on jQuery.treetable");
    }
  };

  // Expose classes to world
  this.TreeTable || (this.TreeTable = {});
  this.TreeTable.Node = Node;
  this.TreeTable.Tree = Tree;
})(jQuery);
;

(function ($, Drupal, drupalSettings) {

  'use strict';

  Drupal.behaviors.tokenTree = {
    attach: function (context, settings) {
      $(once('token-tree', 'table.token-tree', context)).treetable({ expandable: true});
    }
  };

  Drupal.behaviors.tokenInsert = {
    attach: function (context, settings) {
      // Keep track of which textfield was last selected/focused.
      $('textarea, input[type="text"]', context).focus(function () {
        drupalSettings.tokenFocusedField = this;
      });

      once('token-click-insert', '.token-click-insert .token-key', context).forEach(function (token) {
        var newThis = $('<a href="javascript:void(0);" title="' + Drupal.t('Insert this token into your form') + '">' + $(token).html() + '</a>').click(function () {
          var content = this.text;

          // Always work in normal text areas that currently have focus.
          if (drupalSettings.tokenFocusedField && (drupalSettings.tokenFocusedField.tokenDialogFocus || drupalSettings.tokenFocusedField.tokenHasFocus)) {
            insertAtCursor(drupalSettings.tokenFocusedField, content);
          }
          // Direct tinyMCE support.
          else if (typeof(tinyMCE) != 'undefined' && tinyMCE.activeEditor) {
            tinyMCE.activeEditor.execCommand('mceInsertContent', false, content);
          }
          // Direct CKEditor support. Only works if the field currently has focus,
          // which is unusual since the dialog is open.
          else if (typeof(CKEDITOR) != 'undefined' && CKEDITOR.currentInstance) {
            CKEDITOR.currentInstance.insertHtml(content);
          }
          // Direct CodeMirror support.
          else if (typeof(CodeMirror) != 'undefined' && drupalSettings.tokenFocusedField && $(drupalSettings.tokenFocusedField).parents('.CodeMirror').length) {
            var editor = $(drupalSettings.tokenFocusedField).parents('.CodeMirror')[0].CodeMirror;
            editor.replaceSelection(content);
            editor.focus();
          }
          // WYSIWYG support, should work in all editors if available.
          else if (Drupal.wysiwyg && Drupal.wysiwyg.activeId) {
            Drupal.wysiwyg.instances[Drupal.wysiwyg.activeId].insert(content)
          }
          // CKeditor module support.
          else if (typeof(CKEDITOR) != 'undefined' && typeof(Drupal.ckeditorActiveId) != 'undefined') {
            CKEDITOR.instances[Drupal.ckeditorActiveId].insertHtml(content);
          }
          else if (drupalSettings.tokenFocusedField) {
            insertAtCursor(drupalSettings.tokenFocusedField, content);
          }
          else {
            alert(Drupal.t('First click a text field to insert your tokens into.'));
          }

          return false;
        });
        $(token).html(newThis);
      });

      function insertAtCursor(editor, content) {
        // Record the current scroll position.
        var scroll = editor.scrollTop;

        // IE support.
        if (document.selection) {
          editor.focus();
          var sel = document.selection.createRange();
          sel.text = content;
        }

        // Mozilla/Firefox/Netscape 7+ support.
        else if (editor.selectionStart || editor.selectionStart == '0') {
          var startPos = editor.selectionStart;
          var endPos = editor.selectionEnd;
          editor.value = editor.value.substring(0, startPos) + content + editor.value.substring(endPos, editor.value.length);
        }

        // Fallback, just add to the end of the content.
        else {
          editor.value += content;
        }

        // Ensure the textarea does not unexpectedly scroll.
        editor.scrollTop = scroll;
      }
    }
  };

})(jQuery, Drupal, drupalSettings);
;
