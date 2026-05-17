import { Component, Inject, PLATFORM_ID, OnInit, HostBinding } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

interface Cita {
    fecha?: string;
    hora: string;
    paciente: string;
    tipo: string;
    estado: string;
    claseEstado: string;
}

interface Paciente {
    nombre: string;
    edad: number | string;
    diagnostico: string;
    ultimaSesion: string;
}

interface DiaCalendario {
    fecha: number;
    esHoy: boolean;
    tieneCita: boolean;
    fueraDeMes?: boolean;
    fechaCompleta?: string;
}

interface Factura {
    id: string;
    paciente: string;
    fecha: string;
    monto: number;
    estado: string;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.html',
    styleUrls: ['./app.css'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule]
})
export class App implements OnInit {
    title = 'Lumina';
    isLandingHidden = false; // Controla la visibilidad de la pantalla de inicio
    isModalActive = false; // Controla la visibilidad del modal
    isPacienteModalActive = false; // Controla la visibilidad del modal de paciente
    currentView = 'inicio'; // Controla la vista actual
    
    // Controla el tema de la aplicación bindeándolo a la clase del host
    @HostBinding('class.dark-theme') isDarkMode = false;

    // Control de la notificación Toast
    isToastActive = false;
    toastMessage = '';
    private toastTimeout: any;

    // Formulario reactivo para las citas
    citaForm: FormGroup;

    // Formulario reactivo para los pacientes
    pacienteForm: FormGroup;
    pacienteOriginalNombre = '';

    // Control para la barra de búsqueda de pacientes
    searchControl = new FormControl('');

    // Lista dinámica de próximas sesiones
    citas: Cita[] = [];

    // Lista de pacientes de prueba
    pacientes: Paciente[] = [
        { nombre: 'María López', edad: 34, diagnostico: 'Ansiedad Generalizada', ultimaSesion: '10 May 2026' },
        { nombre: 'Carlos Ruiz', edad: 28, diagnostico: 'Depresión Leve', ultimaSesion: '08 May 2026' }
    ];

    // Array para alimentar el calendario
    diasCalendario: DiaCalendario[] = [];

    // Variables para la navegación del calendario
    mesActual = new Date().getMonth(); // Mes actual dinámico
    anioActual = new Date().getFullYear(); // Año actual dinámico
    mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    get nombreMesActual() {
        return `${this.mesesNombres[this.mesActual]} ${this.anioActual}`;
    }

    // Lista de facturas de prueba
    facturas: Factura[] = [
        { id: 'FAC-2026-001', paciente: 'María López', fecha: '10 May 2026', monto: 60.00, estado: 'Pagado' },
        { id: 'FAC-2026-002', paciente: 'Carlos Ruiz', fecha: '08 May 2026', monto: 60.00, estado: 'Pendiente' },
        { id: 'FAC-2026-003', paciente: 'Laura Gómez', fecha: '05 May 2026', monto: 75.00, estado: 'Pagado' },
        { id: 'FAC-2026-004', paciente: 'Javier Fernández', fecha: '02 May 2026', monto: 50.00, estado: 'Pagado' }
    ];

    // Getter para obtener la lista de pacientes filtrada dinámicamente
    get pacientesFiltrados() {
        const term = (this.searchControl.value || '').toLowerCase();
        return this.pacientes.filter(p => 
            p.nombre.toLowerCase().includes(term) || 
            p.diagnostico.toLowerCase().includes(term)
        );
    }

    // Getter para obtener el total de pacientes registrados
    get numeroPacientesActivos() {
        return this.pacientes.length;
    }

    // Getter para obtener el número de citas programadas para "hoy"
    get numeroCitasHoy() {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const dia = hoy.getDate().toString().padStart(2, '0');
        const fechaActual = `${anio}-${mes}-${dia}`;
        
        return this.citas.filter(cita => cita.fecha === fechaActual).length;
    }

    // Getter para obtener el número de facturas pendientes
    get numeroFacturasPendientes() {
        return this.facturas.filter(f => f.estado.toLowerCase() === 'pendiente').length;
    }

    // Getter para obtener solo las citas futuras o del día actual
    get proximasCitas() {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const dia = hoy.getDate().toString().padStart(2, '0');
        const fechaActual = `${anio}-${mes}-${dia}`;

        return this.citas.filter(cita => (cita.fecha || '') >= fechaActual);
    }

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {
        this.citaForm = new FormGroup({
            paciente: new FormControl('', Validators.required),
            fecha: new FormControl('', Validators.required),
            hora: new FormControl('', Validators.required),
            tipo: new FormControl(''), // Opcional
            edad: new FormControl(''), // Opcional
            estado: new FormControl('Online', Validators.required)
        });

        this.pacienteForm = new FormGroup({
            nombre: new FormControl('', Validators.required),
            edad: new FormControl('', Validators.required),
            diagnostico: new FormControl('', Validators.required),
            ultimaSesion: new FormControl('', Validators.required)
        });
    }

    ngOnInit() {
        // Solo intentamos acceder a localStorage si estamos corriendo en el navegador (client-side)
        if (isPlatformBrowser(this.platformId)) {
            const citasGuardadas = localStorage.getItem('lumina_citas');
            if (citasGuardadas) {
                this.citas = JSON.parse(citasGuardadas);
            } else {
                this.citas = [
                    { fecha: '2026-05-10', hora: '10:00 - 11:00', paciente: 'María López', tipo: 'Terapia Cognitivo-Conductual', estado: 'Online', claseEstado: 'online' },
                    { fecha: '2026-05-12', hora: '11:30 - 12:30', paciente: 'Carlos Ruiz', tipo: 'Seguimiento de ansiedad', estado: 'Presencial', claseEstado: 'presencial' }
                ];
            }

            // Cargar pacientes desde localStorage si existen
            const pacientesGuardados = localStorage.getItem('lumina_pacientes');
            if (pacientesGuardados) {
                this.pacientes = JSON.parse(pacientesGuardados);
            } else {
                // Dejamos los iniciales alineados con las citas por defecto
                this.pacientes = [
                    { nombre: 'María López', edad: 34, diagnostico: 'Ansiedad Generalizada', ultimaSesion: '10 May 2026' },
                    { nombre: 'Carlos Ruiz', edad: 28, diagnostico: 'Depresión Leve', ultimaSesion: '08 May 2026' }
                ];
            }
            
            // Cargar la preferencia del modo oscuro
            const darkModeGuardado = localStorage.getItem('lumina_dark_mode');
            if (darkModeGuardado === 'true') {
                this.isDarkMode = true;
            }

            this.ordenarCitas();
            this.generarCalendario();
        }
    }

    private ordenarCitas() {
        this.citas.sort((a, b) => {
            // Limpiamos fechas por si traen espacios invisibles
            const fechaA = (a.fecha || '1970-01-01').trim();
            const fechaB = (b.fecha || '1970-01-01').trim();
            
            // Limpiamos la hora para extraer solo la hora inicial (ej. de "13:00 - 14:00" extrae "13:00")
            let horaLimpiaA = (a.hora || '00:00').split('-')[0].trim().substring(0, 5);
            let horaLimpiaB = (b.hora || '00:00').split('-')[0].trim().substring(0, 5);
            
            // Añadimos un 0 delante si es necesario (ej. "9:00" -> "09:00")
            if (horaLimpiaA.length === 4) horaLimpiaA = '0' + horaLimpiaA;
            if (horaLimpiaB.length === 4) horaLimpiaB = '0' + horaLimpiaB;
            
            // Creamos un objeto Date real uniendo fecha y hora para obtener el Timestamp (milisegundos exactos)
            const timeA = new Date(`${fechaA}T${horaLimpiaA}:00`).getTime();
            const timeB = new Date(`${fechaB}T${horaLimpiaB}:00`).getTime();
            
            // Devolvemos la resta de los milisegundos (un cálculo matemático infalible para ordenar fechas)
            if (!isNaN(timeA) && !isNaN(timeB)) {
                return timeA - timeB;
            }
            
            // Respaldo por si hubiera algún dato tan corrupto que rompa la función Date nativa
            return `${fechaA}T${horaLimpiaA}`.localeCompare(`${fechaB}T${horaLimpiaB}`);
        });
    }

    private generarCalendario() {
        this.diasCalendario = []; // Limpiamos el array antes de reescribirlo

        // Obtener el primer día de la semana (0 = Domingo ... 6 = Sábado)
        const fechaPrimerDia = new Date(this.anioActual, this.mesActual, 1);
        let primerDiaSemana = fechaPrimerDia.getDay();
        
        // En nuestra vista la semana empieza en Lunes, ajustamos el índice (0 = Lunes, 6 = Domingo)
        primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

        // Obtener cuántos días tiene el mes actual y el anterior
        const diasTotales = new Date(this.anioActual, this.mesActual + 1, 0).getDate();
        const diasMesAnterior = new Date(this.anioActual, this.mesActual, 0).getDate();
        
        // Rellenar días grises del mes anterior
        for (let i = 0; i < primerDiaSemana; i++) {
            this.diasCalendario.push({ 
                fecha: diasMesAnterior - primerDiaSemana + i + 1, 
                esHoy: false, 
                tieneCita: false, 
                fueraDeMes: true 
            });
        }
        
        // Rellenar días del mes actual
        for (let i = 1; i <= diasTotales; i++) {
            // Formateamos la fecha a YYYY-MM-DD para compararla con el input del formulario
            const mesStr = (this.mesActual + 1).toString().padStart(2, '0');
            const diaStr = i.toString().padStart(2, '0');
            const fechaCalendario = `${this.anioActual}-${mesStr}-${diaStr}`;
            
            const tieneEvento = this.citas.some(cita => cita.fecha === fechaCalendario);

            // Comprobamos si es el día actual
            const hoy = new Date();
            const esHoy = (this.anioActual === hoy.getFullYear() && this.mesActual === hoy.getMonth() && i === hoy.getDate());

            this.diasCalendario.push({ 
                fecha: i, 
                esHoy: esHoy,
                tieneCita: tieneEvento,
                fechaCompleta: fechaCalendario
            });
        }
    }

    private guardarEnStorage() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('lumina_citas', JSON.stringify(this.citas));
        }
    }

    private guardarPacientesEnStorage() {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('lumina_pacientes', JSON.stringify(this.pacientes));
        }
    }

    mesAnterior() {
        this.mesActual--;
        if (this.mesActual < 0) {
            this.mesActual = 11;
            this.anioActual--;
        }
        this.generarCalendario();
    }

    mesSiguiente() {
        this.mesActual++;
        if (this.mesActual > 11) {
            this.mesActual = 0;
            this.anioActual++;
        }
        this.generarCalendario();
    }

    entrar() {
        // Cambiamos el estado, Angular actualizará las clases al instante
        this.isLandingHidden = true;
    }

    cambiarVista(vista: string, event: Event) {
        event.preventDefault();
        this.currentView = vista;
    }

    abrirModal() {
        this.isModalActive = true;
    }

    cerrarModal() {
        this.isModalActive = false;
        this.citaForm.reset({ estado: 'Online' }); // Reseteamos al cerrar
    }

    cerrarModalFondo(event: MouseEvent) {
        // Solo cerramos si el usuario hace clic en el fondo oscuro, no en el contenido
        if ((event.target as HTMLElement).classList.contains('modal')) {
            this.isModalActive = false;
            this.isPacienteModalActive = false;
        }
    }

    toggleDarkMode(event: Event) {
        const input = event.target as HTMLInputElement;
        this.isDarkMode = input.checked;
        
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('lumina_dark_mode', String(this.isDarkMode));
        }
    }

    guardarAjustes() {
        // Aquí iría la lógica futura para guardar en base de datos
        this.mostrarToast('Ajustes guardados correctamente');
    }

    mostrarToast(mensaje: string) {
        this.toastMessage = mensaje;
        this.isToastActive = true;
        
        // Si hay un timeout previo, lo cancelamos para que no se oculte antes de tiempo
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        
        // Ocultar automáticamente después de 3 segundos
        this.toastTimeout = setTimeout(() => {
            this.isToastActive = false;
        }, 3000);
    }

    guardarCita() {
        // Si el formulario es inválido (faltan datos requeridos), no hacemos nada
        if (this.citaForm.invalid) return;
        
        const { paciente, fecha, hora, tipo, estado, edad } = this.citaForm.value;
        const clase = estado.toLowerCase() === 'online' ? 'online' : 'presencial';

        this.citas.push({
            fecha: fecha,
            hora: hora,
            paciente: paciente,
            tipo: tipo ? tipo : 'Primera consulta', // Si el campo está vacío, ponemos uno por defecto
            estado: estado,
            claseEstado: clase
        });
        
        this.ordenarCitas(); // Ordenamos inmediatamente la lista tras añadirla
        this.guardarEnStorage();

        // Sincronizar paciente en el directorio "Mis Pacientes"
        const pacienteExiste = this.pacientes.find(p => p.nombre.toLowerCase() === paciente.toLowerCase());
        if (!pacienteExiste) {
            this.pacientes.push({
                nombre: paciente,
                edad: edad || '--', // Se registra la introducida o por defecto si no lo sabemos
                diagnostico: 'Pendiente de evaluación',
                ultimaSesion: fecha || 'Por determinar'
            });
        } else {
            // Actualizar su última sesión si ya existía en la lista
            pacienteExiste.ultimaSesion = fecha || pacienteExiste.ultimaSesion;
        }
        this.guardarPacientesEnStorage();

        this.generarCalendario(); // Actualizamos los puntos de colores del calendario
        this.mostrarToast('Cita programada con éxito');
        this.cerrarModal(); // Cerramos el modal tras guardar
    }

    borrarCita(cita: Cita) {
        // Pedimos confirmación antes de borrar
        if (confirm('¿Estás seguro de que deseas borrar esta cita?')) {
            const index = this.citas.indexOf(cita);
            if (index !== -1) {
                this.citas.splice(index, 1); // Elimina 1 elemento en la posición "index"
                this.guardarEnStorage();

                this.generarCalendario(); // Actualizamos los puntos del calendario tras borrar
                this.mostrarToast('Cita eliminada correctamente');
            }
        }
    }

    borrarPaciente(nombre: string) {
        if (confirm(`¿Estás seguro de que deseas eliminar a ${nombre} y todas sus citas?`)) {
            this.pacientes = this.pacientes.filter(p => p.nombre !== nombre);
            this.guardarPacientesEnStorage();
            this.citas = this.citas.filter(c => c.paciente !== nombre);
            this.guardarEnStorage();
            this.generarCalendario();
            this.mostrarToast('Paciente eliminado correctamente');
        }
    }

    abrirModalPaciente(paciente: Paciente) {
        this.pacienteOriginalNombre = paciente.nombre;
        this.pacienteForm.patchValue({
            nombre: paciente.nombre,
            edad: paciente.edad,
            diagnostico: paciente.diagnostico,
            ultimaSesion: paciente.ultimaSesion
        });
        this.isPacienteModalActive = true;
    }

    cerrarModalPaciente() {
        this.isPacienteModalActive = false;
    }

    guardarPaciente() {
        if (this.pacienteForm.invalid) return;
        const valores = this.pacienteForm.value;
        const index = this.pacientes.findIndex(p => p.nombre === this.pacienteOriginalNombre);
        if (index !== -1) {
            this.pacientes[index] = { ...this.pacientes[index], ...valores };
            this.guardarPacientesEnStorage();
            if (this.pacienteOriginalNombre !== valores.nombre) {
                this.citas.forEach(c => { if (c.paciente === this.pacienteOriginalNombre) c.paciente = valores.nombre; });
                this.guardarEnStorage();
            }
            this.mostrarToast('Perfil de paciente actualizado');
        }
        this.cerrarModalPaciente();
    }

    verCitasDia(dia: DiaCalendario) {
        // Si el día no tiene citas o no tiene una fecha completa asignada, no hacemos nada
        if (!dia.tieneCita || !dia.fechaCompleta) return;
        
        const citasDelDia = this.citas.filter(c => c.fecha === dia.fechaCompleta);
        
        // Formateamos la fecha (de YYYY-MM-DD a DD/MM/YYYY) para que sea más legible
        const partesFecha = dia.fechaCompleta.split('-');
        const fechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
        
        let mensaje = `Citas programadas para el ${fechaFormateada}:\n\n`;
        citasDelDia.forEach(cita => {
            mensaje += `🕒 ${cita.hora} - ${cita.paciente}\n   Tipo: ${cita.tipo} (${cita.estado})\n\n`;
        });
        
        alert(mensaje);
    }
}
