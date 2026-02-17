/** @odoo-module */
import { registry} from '@web/core/registry';
import { useService } from "@web/core/utils/hooks";
import { Component, onMounted, useState, useRef } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";

class ReceptionDashBoard extends Component{
    setup() {
        this.ref = useRef('root');
        this.patient_creation = useRef('patient_creation');
        this.appointments_section = useRef('appointments_section');
        this.room_ward = useRef('room_ward');
        this.action = useService('action');
        this.orm = useService("orm");
        this.state = useState({
            patient_lst : [],
            ward_data : [],
            room_data : [],
            dr_lst: [],
            currentDate: new Date().toISOString().split('T')[0],
            current_appointment_type: 'outpatient', // 'outpatient' or 'inpatient'
            current_room_ward_type: 'ward', // 'ward' or 'room'
        });
        onMounted(async () => {
            await this.createPatient();
        });
    }

    // Method for creating patient
    createPatient(){
        if (!this.ref.el) return;
        
        const activeElement = this.ref.el.querySelector('.r_active');
        if (activeElement) {
            activeElement.classList.remove('r_active');
        }
        
        const patientButton = this.ref.el.querySelector('.o_patient_button');
        if (patientButton) {
            patientButton.classList.add('r_active');
        }

        if (this.room_ward.el) this.room_ward.el.classList.add("d-none");
        if (this.patient_creation.el) this.patient_creation.el.classList.remove("d-none");
        if (this.appointments_section.el) this.appointments_section.el.classList.add("d-none");
    }

    // Method for saving patient
    async savePatient (){
        var data = await this.fetch_patient_data()
        if( data['name']=="" || data['phone']==""){
            alert("Veuillez remplir le nom et le téléphone")
            return;
        }
        await this.orm.call('res.partner','create',[[data]]).then(function (){
           alert("Le dossier patient a été créé avec succès")
           window.location.reload()
        })
    }

    fetch_patient_data() {
        if (!this.ref.el) return {};
        
        const getElementValue = (id) => {
            const element = this.ref.el.querySelector(`#${id}`);
            return element ? element.value : '';
        };
        
        const getElementData = (id, dataAttr) => {
            const element = this.ref.el.querySelector(`#${id}`);
            return element && element.dataset ? element.dataset[dataAttr] || '' : '';
        };
        
        const getCheckedValue = (name) => {
            const element = this.ref.el.querySelector(`input[name='${name}']:checked`);
            return element ? element.value : '';
        };

        const data = {
            name: getElementValue('patient-name'),
            blood_group: getElementValue('patient-bloodgroup'),
            rh_type: getCheckedValue('rhtype'),
            gender: getCheckedValue('gender'),
            marital_status: getElementValue('patient-m-status'),
            phone: getElementValue('patient-phone'),
            email: getElementValue('patient-mail'),
            image_1920: getElementData('patient-img', 'file')
        };

        const dob = getElementValue('patient-dob');
        if (dob) {
            data.date_of_birth = dob;
        }

        return data;
    }

    // Method on clicking appointment button
    fetchAppointmentData (){
        if (!this.ref.el) return;
        
        const activeElement = this.ref.el.querySelector('.r_active');
        if (activeElement) {
            activeElement.classList.remove('r_active');
        }
        const appointmentButton = this.ref.el.querySelector('.o_appointment_button');
        if (appointmentButton) {
            appointmentButton.classList.add('r_active');
        }

        if (this.room_ward.el) this.room_ward.el.classList.add("d-none");
        if (this.patient_creation.el) this.patient_creation.el.classList.add("d-none");
        if (this.appointments_section.el) this.appointments_section.el.classList.remove("d-none");
        
        // Show outpatient by default
        this.createOutPatient();
    }

    // Creates new outpatient
    async createOutPatient (){
        if (!this.ref.el) return;
        
        // Update state
        this.state.current_appointment_type = 'outpatient';
        
        // Update secondary navigation active state
        const appointmentButtons = this.ref.el.querySelectorAll('.r_AppointmentBtn');
        appointmentButtons.forEach((btn, index) => {
            if (index === 0) {
                btn.classList.add('r_active1');
            } else {
                btn.classList.remove('r_active1');
            }
        });
        
        const result = await this.orm.call('res.partner','fetch_patient_data',[]);
        this.state.patient_lst = result;

        const doctorResult = await this.orm.call('doctor.allocation', 'search_read', []);
        this.state.dr_lst = doctorResult;
        
        const selectDoctor = this.ref.el.querySelector('.select_dr');
        if (selectDoctor) {
            selectDoctor.innerHTML = '';
            doctorResult.forEach(element => {
                const option = document.createElement('option');
                option.value = element.id;
                option.textContent = element.display_name;
                selectDoctor.appendChild(option);
            });
        }
        
        const controls = this.ref.el.querySelector('#controls');
        if (controls) {
            controls.innerHTML = '';
        }
        
        const opDate = this.ref.el.querySelector('#op_date');
        if (opDate) {
            opDate.value = new Date().toISOString().split('T')[0];
        }
    }

    // Method for creating inpatient
    async createInPatient (){
        if (!this.ref.el) return;
        
        // Update state
        this.state.current_appointment_type = 'inpatient';
        
        // Update secondary navigation active state
        const appointmentButtons = this.ref.el.querySelectorAll('.r_AppointmentBtn');
        appointmentButtons.forEach((btn, index) => {
            if (index === 1) {
                btn.classList.add('r_active1');
            } else {
                btn.classList.remove('r_active1');
            }
        });

        var domain = [['job_id.name', '=', 'Doctor']];
        
        const patientResult = await this.orm.call('res.partner','fetch_patient_data',[]);
        const patientSelect = this.ref.el.querySelector('.select_patient_id');
        if (patientSelect) {
            patientSelect.innerHTML = '';
            patientResult.forEach(element => {
                const option = document.createElement('option');
                option.value = element.id;
                option.textContent = `${element.patient_seq}-${element.name}`;
                patientSelect.appendChild(option);
            });
        }

        const doctorResult = await this.orm.call('hr.employee','search_read',[domain]);
        const doctorSelect = this.ref.el.querySelector('.attending_doctor_id');
        if (doctorSelect) {
            doctorSelect.innerHTML = '';
            doctorResult.forEach(element => {
                const option = document.createElement('option');
                option.value = element.id;
                option.textContent = element.display_name;
                doctorSelect.appendChild(option);
            });
        }
    }

    // Method for saving outpatient
    async save_out_patient_data (){
        var data = await this.fetch_out_patient_data();
        if (data != false){
            var result = await this.orm.call('res.partner','create_patient',[data]);
            alert('Le rendez-vous a été créé avec succès');
            
            if (!this.ref.el) return;
            
            const clearField = (id) => {
                const element = this.ref.el.querySelector(`#${id}`);
                if (element) element.value = "";
            };
            
            clearField('o_patient-name');
            clearField('sl_patient');
            clearField('o_patient-phone');
            clearField('o_patient-dob');
        }
    }

    // Method for displaying patient card
    patient_card () {
        if (!this.ref.el) return;
        
        const selectType = this.ref.el.querySelector('#select_type');
        const slPatient = this.ref.el.querySelector('#sl_patient');
        const patientLabel = this.ref.el.querySelector('#patient_label');
        
        if (!selectType) return;
        
        if (selectType.value === 'dont_have_card') {
            if (slPatient) slPatient.style.display = 'none';
            if (patientLabel) patientLabel.style.display = 'none';
        } else {
            if (slPatient) slPatient.style.display = 'block';
            if (patientLabel) patientLabel.style.display = 'block';
        }
    }

    // Method for fetching OP details
    async fetch_op_details () {
        if (!this.ref.el) return {};
        
        const patientId = this.ref.el.querySelector('#sl_patient')?.value || '';
        const phone = this.ref.el.querySelector('#o_patient-phone')?.value || '';
        
        return {
            'patient_data': patientId,
            'patient-phone': phone
        };
    }

    // Method for fetching patient details
    async fetch_patient_id () {
        if (!this.ref.el) return;
        
        var data = await this.fetch_op_details();
        await this.orm.call('res.partner', 'reception_op_barcode',[data]).then((result) => {
            if (!this.ref.el) return;
            
            const setValue = (id, value) => {
                const element = this.ref.el.querySelector(`#${id}`);
                if (element) element.value = value || '';
            };
            
            setValue('o_patient-name', result.name);
            setValue('o_patient-dob', result.date_of_birth);
            setValue('o_patient_bloodgroup', result.blood_group);
            setValue('o_patient-gender', result.gender);
            
            if (result.phone) {
                setValue('o_patient-phone', result.phone);
            }
        });
    }

    // Method for fetching outpatient data
    async fetch_out_patient_data () {
        if (!this.ref.el) return false;
        
        const getValue = (id) => {
            const element = this.ref.el.querySelector(`#${id}`);
            return element ? element.value : '';
        };
        
        const getCheckedValue = (selector) => {
            const element = this.ref.el.querySelector(selector);
            return element ? element.value : null;
        };
        
        const oPatientName = getValue('o_patient-name');
        const oPatientPhone = getValue('o_patient-phone');
        const oPatientDob = getValue('o_patient-dob');
        const oPatientBloodGroup = getValue('o_patient_bloodgroup');
        const oPatientRhType = getCheckedValue("input[name='o_rhtype']:checked");
        const oPatientGender = getCheckedValue("input[name='o_patient-gender']:checked");
        const patientId = getValue('sl_patient');
        const opDate = getValue('op_date');
        const reason = getValue('reason');
        const ticketNo = getValue('slot');
        const doctor = getValue('sl_dr');

        if (!oPatientName || !doctor || !opDate) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return false;
        }

        const data = {
            op_name: oPatientName,
            op_phone: oPatientPhone,
            op_blood_group: oPatientBloodGroup,
            op_rh: oPatientRhType,
            op_gender: oPatientGender,
            patient_id: patientId,
            date: opDate,
            reason: reason,
            slot: 0.00,
            doctor: doctor,
        };
        
        if (oPatientDob) {
            data.op_dob = oPatientDob;
        }
        
        return data;
    }

    // Method for fetching inpatient data
    async fetch_in_patient_data (){
        if (!this.ref.el) return false;
        
        const getValue = (id) => {
            const element = this.ref.el.querySelector(`#${id}`);
            return element ? element.value : '';
        };
        
        const patientId = getValue('sl_patient_id');
        const reasonOfAdmission = getValue('reason_of_admission');
        const admissionType = getValue('admission_type');
        const attendingDoctorId = getValue('attending_doctor_id');

        if (!patientId || !attendingDoctorId || !admissionType) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return false;
        }

        return {
            patient_id: patientId,
            reason_of_admission: reasonOfAdmission,
            admission_type: admissionType,
            attending_doctor_id: attendingDoctorId,
        };
    }

    // Method for creating new inpatient
    async save_in_patient_data (){
        const data = await this.fetch_in_patient_data();
        if (data != false && data != null && data != undefined){
            await this.orm.call('hospital.inpatient','create_new_in_patient',[null,data]).then(() => {
                alert('L\'admission a été créée avec succès');
                
                if (!this.ref.el) return;
                
                const clearField = (id) => {
                    const element = this.ref.el.querySelector(`#${id}`);
                    if (element) element.value = "";
                };
                
                clearField('sl_patient_id');
                clearField('reason_of_admission');
                clearField('admission_type');
                clearField('attending_doctor_id');
            });
        }
    }

    // Method for getting room or ward details
    fetchRoomWard (){
        if (!this.ref.el) return;
        
        const activeElement = this.ref.el.querySelector('.r_active');
        if (activeElement) {
            activeElement.classList.remove('r_active');
        }
        const roomWardButton = this.ref.el.querySelector('.o_room_ward_button');
        if (roomWardButton) {
            roomWardButton.classList.add('r_active');
        }

        if (this.room_ward.el) this.room_ward.el.classList.remove("d-none");
        if (this.patient_creation.el) this.patient_creation.el.classList.add("d-none");
        if (this.appointments_section.el) this.appointments_section.el.classList.add("d-none");
        
        // Show ward by default
        this.fetchWard();
    }

    // Method for getting ward details
    async fetchWard (){
        if (!this.ref.el) return;
        
        // Update state
        this.state.current_room_ward_type = 'ward';
        
        // Update secondary navigation active state
        const roomWardButtons = this.ref.el.querySelectorAll('.r_RoomWard');
        roomWardButtons.forEach((btn, index) => {
            if (index === 0) {
                btn.classList.add('r_active2');
            } else {
                btn.classList.remove('r_active2');
            }
        });

        var result = await this.orm.call('hospital.ward','search_read',[]);
        this.state.ward_data = result;
    }

    // Method for getting room details
    async fetchRoom (){
        if (!this.ref.el) return;
        
        // Update state
        this.state.current_room_ward_type = 'room';
        
        // Update secondary navigation active state
        const roomWardButtons = this.ref.el.querySelectorAll('.r_RoomWard');
        roomWardButtons.forEach((btn, index) => {
            if (index === 1) {
                btn.classList.add('r_active2');
            } else {
                btn.classList.remove('r_active2');
            }
        });

        var result = await this.orm.call('patient.room','search_read',[]);
        this.state.room_data = result;
    }
}

ReceptionDashBoard.template = "ReceptionDashboard"
registry.category('actions').add('reception_dashboard_tags', ReceptionDashBoard);