/** @odoo-module */
/**
 * Backend listener for incoming teleconsultation calls.
 *
 * The /teleconsultation/signal/send controller pushes a
 * "teleconsult_incoming_call" bus event to the doctor's partner when the
 * patient enters the WebRTC room; this service pops a dialog with a button
 * that opens the video room in a new tab.
 */
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

export const teleconsultNotificationService = {
    dependencies: ["bus_service", "dialog"],
    start(env, { bus_service, dialog }) {
        bus_service.subscribe("teleconsult_incoming_call", (payload) => {
            dialog.add(ConfirmationDialog, {
                title: _t("📞 Téléconsultation en attente"),
                body: _t(
                    "%s est en ligne pour la téléconsultation %s.",
                    payload.patient_name,
                    payload.op_reference
                ),
                confirmLabel: _t("Rejoindre la conversation"),
                confirm: () => {
                    window.open(payload.url, "_blank");
                },
                cancelLabel: _t("Plus tard"),
                cancel: () => {},
            });
        });
        bus_service.start();
    },
};

registry
    .category("services")
    .add("teleconsult_notification", teleconsultNotificationService);
