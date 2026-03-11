import { DocumentType, TrainingType } from '@/lib/generated/prisma/enums'
import { useCompanyStore } from '@/stores/company'
import { useDashboardStore } from '@/stores/dashboard'
import { useDocumentStore } from '@/stores/documents'
import { useEmployeesStore } from '@/stores/employees'
import { usePassportStore } from '@/stores/passport'
import { useUserStore } from '@/stores/user'
import axios from 'axios'

const base_url = 'http://localhost:3000/api'

export async function GetCompanies(userId: string) {
    try {
        const { data } = await axios.post(
            '/company/get-companies',
            { userId },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useCompanyStore.companies = data

        return data
    } catch (error) {
        console.log(error)
    }
}

export async function updateNotifications(payload: {
    documentExpirationAlerts: boolean,
    newEmployeeAlerts: boolean,
    email: string
}) {
    try {
        const { data } = await axios.put(
            '/user/update-notifications',
            { ...payload },
            {
                baseURL: base_url,
                withCredentials: true
            }
        )

        await auth()

        return data
    } catch (error) {
        throw error
    }
}

export async function login(payload: { email: string, password: string }) {
    try {
        const { data } = await axios.post(
            '/user/login',
            { ...payload },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        return data
    } catch (error) {
        throw error
    }
}

export async function auth() {
    const { data } = await axios.post(
        '/auth',
        {},
        {
            baseURL: base_url,
            withCredentials: true,
        }
    )

    useUserStore.user = data.user
    useUserStore.user_token = data.user.id
    useUserStore.superadmin = false

    return data
}

export async function getCompanyData(id: string) {
    try {
        const { data } = await axios.post(
            '/company/show-company',
            { id },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useCompanyStore.company_selected = data

        return data
    } catch (error) {
        throw error
    }
}

export async function createCompany(payload: {
    name: string,
    image_url: string,
    cnpj: string,
    email: string,
    phone: string,
    address: string,
    state: string,
    city: string,
    responsible: string,
    userId: string
}) {
    try {
        const { data } = await axios.post(
            '/company/create-company',
            payload,
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function updateCompany(payload: any) {
    try {
        const { data } = await axios.put(
            '/company/update-company',
            payload,
            { baseURL: base_url }
        )
        useCompanyStore.company_selected = data.response
        return data
    } catch (error) {
        throw error
    }
}

export async function getCompanyDocuments(company_id: string) {
    try {
        const { data } = await axios.post(
            '/company-documents/get-documents',
            { company_id },
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function updateCompanyDocument(payload: {
    id?: string,
    type: string,
    companyId: string,
    expiresAt?: string,
    issuedAt?: string,
    fileUrl: string,
}) {
    try {
        const { data } = await axios.put(
            '/company-documents/update-document',
            payload,
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function getDashboardData(company_id: string) {
    try {
        const { data } = await axios.post(
            '/dashboard',
            { company_id },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useDashboardStore.dashboard = data

        return data
    } catch (error) {
        throw error
    }
}

type CreateEmployeePayload = {
    name: string
    email: string
    cpf: string
    rg: string
    gender: "MALE" | "FEMALE"
    image?: string
    position: string
    rotation?: "MORNING" | "AFTERNOON" | "NIGHT"
    birthDate: string
    companyId: string
    cep: string,
    address: string,
    number: string,
    city: string,
    district: string,
    complement: string,
    contact: string,
    emergencyContact: string,
    admissionDate: string,
    contractEndDate?: string
}

export async function createEmployee(payload: CreateEmployeePayload) {
    try {
        const { data } = await axios.post(
            "/employees/create-employee",
            payload,
            {
                headers: { "Content-Type": "application/json" },
                baseURL: base_url
            }
        )

        await getEmployees(payload.companyId)

        return data
    } catch (error) {
        throw error
    }
}

export async function getDocsDashboard(company_id: string) {
    try {
        const { data } = await axios.post(
            '/documents/dashboard',
            { company_id },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useDocumentStore.dashboard = data

        return data
    } catch (error) {
        throw error
    }
}

export async function getDocuments(company_id: string) {
    try {
        const { data } = await axios.post(
            '/documents/get-documents',
            { company_id },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useDocumentStore.documents = data

        return data
    } catch (error) {
        throw error
    }
}

export async function getEmployees(company_id: string) {
    try {
        const { data } = await axios.post(
            '/employees/get-employees',
            { companyId: company_id },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useEmployeesStore.employees = data

        return data
    } catch (error) {
        throw error
    }
}

export async function getAllUsers(company_id: string) {
    try {
        const { data } = await axios.post(
            '/user/get-users',
            { company_id },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )

        useUserStore.all_users = data

        return data
    } catch (error) {
        throw error
    }
}

export async function uploadImage(file: File) {
    try {
        const formData = new FormData()

        formData.append("file", file)

        formData.append("folder", "employees")

        const { data } = await axios.post("/cloudinary/upload", formData, {
            baseURL: base_url,
            headers: {
                "Content-Type": "multipart/form-data",
            },
        })

        return data
    } catch (error) {
        throw error
    }
}

export async function updateEmployeeDocument(payload: {
    id: string,
    expiresAt: string,
    issuedAt: string,
    fileUrl: string,
}, employee_id: string) {
    try {
        const { data } = await axios.put(
            '/employees/update-document',
            { ...payload },
            { baseURL: base_url }
        )

        await getDocsOfEmployee(employee_id)

        return data
    } catch (error) {
        throw error
    }
}

export async function getDocsOfEmployee(employee_id: string) {
    try {
        const { data } = await axios.post(
            '/employees/get-documents',
            { employee_id },
            { baseURL: base_url }
        )

        useEmployeesStore.employee_documents = data

        return data
    } catch (error) {
        throw error
    }
}

export async function showEmployee(id: string) {
    try {
        const { data } = await axios.post(
            '/employees/show-employee',
            { id },
            { baseURL: base_url }
        )

        useEmployeesStore.show_employee = data

        return data
    } catch (error) {
        throw error
    }
}

export async function updateEmployeeData(employee_id: string, payload: {
    name?: string,
    email?: string,
    cpf?: string,
    rg?: string,
    position?: string,
    rotation?: "MORNING" | "AFTERNOON" | "NIGHT",
    image?: string,
    gender?: "MALE" | "FEMALE",
    supervisor?: string,
    registration?: string,
    address?: {
        city?: string,
        district?: string,
        street?: string,
        number?: string,
        cep?: string,
        complement?: string
    },
    contactPhone?: string,
    emergencyContact?: string,
    dismissedAt?: string,
}) {
    try {
        const { data } = await axios.put(
            '/employees/update-employee',
            { id: employee_id, ...payload },
            { baseURL: base_url }
        )

        await showEmployee(employee_id)

        return data
    } catch (error) {
        throw error
    }
}

export async function createUser(payload: {
    name: string,
    email: string,
    password: string,
    role: "ADMIN" | "RH",
    companyId: string
}) {
    try {
        const { data } = await axios.post(
            '/user/create-user',
            { ...payload },
            {
                baseURL: base_url
            }
        )

        await getAllUsers(payload.companyId)

        return data
    } catch (error) {
        throw error
    }
}

export async function deleteUser(payload: {
    user_id: string,
    company_id: string
}) {
    try {
        const { data } = await axios.delete(
            '/user/delete',
            {
                data: payload,
                baseURL: base_url
            }
        )

        await getAllUsers(payload.company_id)

        return data
    } catch (error) {
        throw error
    }
}

export async function updateUser(payload: {
    name?: string,
    email?: string,
    role?: "ADMIN" | "RH",
    password?: string,
    current_password?: string,
    user_id: string,
    companyId: string
}) {
    try {
        const user_token = useUserStore.user_token

        const { data } = await axios.put(
            '/user/update-user',
            { ...payload },
            {
                headers: {
                    Authorization: `Bearer ${user_token}`,
                },
                baseURL: base_url
            }
        )

        await getAllUsers(payload.companyId)

        return data
    } catch (error) {
        throw error
    }
}

export async function updateProfile(payload: {
    name?: string,
    email?: string,
}) {
    try {
        const { data } = await axios.put(
            '/user/update-profile',
            { ...payload },
            {
                baseURL: base_url,
                withCredentials: true
            }
        )

        await auth()

        return data
    } catch (error) {
        throw error
    }
}

export async function updatePassword(payload: {
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    userId: string
}) {
    try {
        const { data } = await axios.put(
            '/user/update-password',
            { ...payload },
            {
                baseURL: base_url,
                withCredentials: true
            }
        )

        return data
    } catch (error) {
        throw error
    }
}

export async function logout() {
    try {
        await axios.post(
            '/user/logout',
            {},
            {
                baseURL: base_url,
                withCredentials: true
            }
        )

        useUserStore.user = null
        useUserStore.user_token = ''

        window.location.href = '/login'
    } catch (error) {
        throw error
    }
}

export async function getTrainings(employee_id: string) {
    try {
        const { data } = await axios.post(
            '/employees/get-trainings',
            { employee_id },
            { baseURL: base_url }
        )

        useEmployeesStore.employee_trainings = data

        return data
    } catch (error) {
        throw error
    }
}

export async function updateTraining(payload: {
    id: string,
    expiresAt?: string,
    issuedAt?: string,
    fileUrl?: string,
    status?: string
}, employee_id: string) {
    try {
        const { data } = await axios.put(
            '/employees/update-training',
            { ...payload },
            { baseURL: base_url }
        )

        await getTrainings(employee_id)

        return data
    } catch (error) {
        throw error
    }
}

export async function emitPassport(employeeId: string) {
    try {
        const { data } = await axios.post(
            '/passport/emit',
            { employeeId },
            { baseURL: base_url }
        )

        return data
    } catch (error) {
        throw error
    }
}

export async function getPassportHistory(companyId: string) {
    try {
        const { data } = await axios.post(
            '/passport/history',
            { companyId },
            { baseURL: base_url }
        )

        usePassportStore.emissions = data

        return data
    } catch (error) {
        throw error
    }
}

export async function superAdminLogin(payload: { email: string, password: string }) {
    try {
        const { data } = await axios.post(
            '/superadmin/login',
            { ...payload },
            {
                headers: { 'Content-Type': 'application/json' },
                baseURL: base_url
            }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function superAdminAuth() {
    try {
        const { data } = await axios.post(
            '/superadmin/auth',
            {},
            {
                baseURL: base_url,
                withCredentials: true,
            }
        )

        useUserStore.user = data.user
        useUserStore.user_token = data.user.id
        useUserStore.superadmin = true

        return data
    } catch (error) {
        throw error
    }
}

export async function superAdminLogout() {
    try {
        await axios.post(
            '/superadmin/logout',
            {},
            {
                baseURL: base_url,
                withCredentials: true
            }
        )

        useUserStore.user = null
        useUserStore.user_token = ''

        window.location.href = '/superadmin/login'
    } catch (error) {
        throw error
    }
}

export async function getSuperAdminDashboard() {
    try {
        const { data } = await axios.get(
            '/superadmin/dashboard',
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}
export async function getSuperAdminUsers() {
    try {
        const { data } = await axios.get(
            '/superadmin/users',
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function updateSuperAdminUser(payload: {
    userId: string,
    name?: string,
    email?: string,
    role?: string,
    newPassword?: string
}) {
    try {
        const { data } = await axios.put(
            '/superadmin/users',
            payload,
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function deleteSuperAdminUser(userId: string) {
    try {
        const { data } = await axios.delete(
            '/superadmin/users',
            { data: { userId }, baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function toggleCompanyStatus(companyId: string, action: "block" | "unblock") {
    try {
        const { data } = await axios.put(
            '/superadmin/toggle-company',
            { companyId, action },
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}

export async function getSuperAdminCompanies() {
    try {
        const { data } = await axios.get(
            '/superadmin/companies',
            { baseURL: base_url }
        )
        return data
    } catch (error) {
        throw error
    }
}
