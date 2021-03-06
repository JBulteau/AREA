import {expect} from '@loopback/testlab';
import {User} from "../../../models";
import {TestHelper} from "../../acceptance/test-helper";

describe('/users', () => {
    const helper: TestHelper = new TestHelper();

    let adminId: string | undefined;
    let adminToken: string;
    let admin: User | undefined;
    const userData = {
        email: "test@test.fr",
        password: 'test'
    };

    before('setupApplication', async () => {
        await helper.initTestHelper();
    });
    beforeEach(async () => {
        await helper.userRepository.deleteAll();
        admin = await helper.createUser(userData.email, userData.password, true);
        adminId = admin.id;
        adminToken = await helper.getJWT(userData.email, userData.password);
    });

    after(async () => {
        await helper.stop();
    });

    describe('POST /users/register', () => {
        it('Error when email already taken', async () => {
            const res = await helper.client
                .post('/users/register?redirectURL=http://localhost:8081/validate?api=http://localhost:8080')
                .send({email: "test@test.fr", password: "p@22w0rd"})
                .expect(409);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Email already in use')
        });

        it('Error when email is invalid', async () => {
            const res = await helper.client
                .post('/users/register?redirectURL=http://localhost:8081/validate?api=http://localhost:8080')
                .send({email: "testest.fr", password: "p@22w0rd"})
                .expect(422);
            const error = JSON.parse(res.error.text);
            expect(error.error.details[0].message).to.equal('should match format "email"') // TODO: Looking for replacing this message by a custom message
        });

        it('Empty email', async () => {
            const res = await helper.client
                .post('/users/register?redirectURL=http://localhost:8081/validate?api=http://localhost:8080')
                .send({password: "p@22w0rd"})
                .expect(422);
            const error = JSON.parse(res.error.text);
            expect(error.error.details[0].message).to.equal('should have required property \'email\'')
        });

        it('Empty password', async () => {
            const res = await helper.client
                .post('/users/register?redirectURL=http://localhost:8081/validate?api=http://localhost:8080')
                .send({email: "test@test.fr"})
                .expect(422);
            const error = JSON.parse(res.error.text);
            expect(error.error.details[0].message).to.equal('should have required property \'password\'')
        });

        it('Success', async () => {
            const newUser = {email: "test@area.fr", password: "p@22w0rd"};
            const res = await helper.client
                .post('/users/register?redirectURL=http://localhost:8081/validate?api=http://localhost:8080')
                .send(newUser)
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.validationToken).to.not.empty();
            expect(dbUser.role).containDeep(['email_not_validated']);
            expect(dbUser.role).not.containDeep(['user']);
        });

        it('Should fail when redirect url is not given', async () => {
            const newUser = {email: "test@area.fr", password: "p@22w0rd"};
            const res = await helper.client
                .post('/users/register')
                .send(newUser)
                .expect(400);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Missing redirect URL.')
        });
    });

    describe('POST /users/login', () => {
        it('Success', async () => {
            const res = await helper.client
                .post('/users/login')
                .send(userData)
                .expect(200);
            const body = res.body;
            expect(body.token).to.not.empty();
        });

        it('fails when email invalid', async () => {
            await helper.client
                .post('/users/login')
                .send({
                    email: "test@testa.fr",
                    password: 'test'
                })
                .expect(401);
        });

        it('fails when password invalid', async () => {
            await helper.client
                .post('/users/login')
                .send({
                    email: "test@test.fr",
                    password: 'testeuh'
                })
                .expect(401);
        });

        it('fails when password and email are invalid', async () => {
            await helper.client
                .post('/users/login')
                .send({
                    email: "test@testa.fr",
                    password: 'testeuh'
                })
                .expect(401);
        });

        it('fails when password and email are empty', async () => {
            await helper.client
                .post('/users/login')
                .send({
                    email: "",
                    password: ''
                })
                .expect(422);
        });

        it('fails when email is empty', async () => {
            await helper.client
                .post('/users/login')
                .send({
                    email: "",
                    password: 'testeuh'
                })
                .expect(422);
        });

        it('fails when password is empty', async () => {
            await helper.client
                .post('/users/login')
                .send({
                    email: "test@test.fr",
                    password: ''
                })
                .expect(422);
        });
    });

    describe('GET /users/refreshToken', function () {
        it('Should send a new token', async () => {
            const res = await helper.client
                .get('/users/refreshToken')
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);
            const body = res.body;
            expect(body.token).to.not.empty();
        });

        it('Should return a 401 when request with authorization header', async () => {
            const res = await helper.client
                .get('/users/refreshToken')
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Authorization header not found.');
        });
    });

    describe('POST /users/resetPassword', () => {
        it('Should create a reset password token on existing user', async () => {
            const user = await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: undefined,
                role: ['user']
            });
            const postData = {
                email: 'test2@test.fr',
                redirectURL: 'http://localhost:8081/reset?api=http://localhost:8080'
            };
            await helper.client
                .post('/users/resetPassword')
                .send(postData)
                .expect(200);
            const dbUser: User = await helper.userRepository.findById(user.id);
            expect(dbUser.resetToken).to.not.empty();
            expect(dbUser.resetToken).to.not.null();
        });
        it('Should not create error on non existing user', async () => {
            const postData = {
                email: 'test2@test.fr',
                redirectURL: 'http://localhost:8081/reset?api=http://localhost:8080'
            };
            await helper.client
                .post('/users/resetPassword')
                .send(postData)
                .expect(200);
        });
        it('Should raise error on missing email', async () => {
            const postData = {
                redirectURL: 'http://localhost:8081/reset?api=http://localhost:8080'
            };
            await helper.client
                .post('/users/resetPassword')
                .send(postData)
                .expect(422);
        });
        it('Should raise error on missing redirectURL', async () => {
            const postData = {
                email: 'test2@test.fr'
            };
            await helper.client
                .post('/users/resetPassword')
                .send(postData)
                .expect(422);
        });
        it('Should raise error on invalid email', async () => {
            const postData = {
                email: 'thisIsNotAnEmail',
                redirectURL: 'http://localhost:8081/reset?api=http://localhost:8080'
            };
            await helper.client
                .post('/users/resetPassword')
                .send(postData)
                .expect(400);
        });
    });

    describe('PATCH /users/resetPassword', () => {
        it('Should validate a reset token and change password', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            const user = await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: undefined,
                role: ['user'],
                resetToken: token
            });
            const patchData = {
                token: token,
                password: 'newPassword'
            };
            await helper.client
                .patch('/users/resetPassword')
                .send(patchData)
                .expect(200);
            const dbUser: User = await helper.userRepository.findById(user.id);
            expect(dbUser.resetToken).to.be.null();
            expect(dbUser.password).to.not.equal(user.password);
        });
        it('Should raise an Not Found error on non existing token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            const user = await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: undefined,
                role: ['user'],
                resetToken: undefined
            });
            const patchData = {
                token: token,
                password: 'newPassword'
            };
            await helper.client
                .patch('/users/resetPassword')
                .send(patchData)
                .expect(404);
            const dbUser: User = await helper.userRepository.findById(user.id);
            expect(dbUser.password).to.equal(user.password);
        });
        it('Should raise an Not Found error on invalid token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            const user = await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: undefined,
                role: ['user'],
                resetToken: 'vcxwmlkjhgfdsqpoiuytreza'
            });
            const patchData = {
                token: token,
                password: 'newPassword'
            };
            await helper.client
                .patch('/users/resetPassword')
                .send(patchData)
                .expect(404);
            const dbUser: User = await helper.userRepository.findById(user.id);
            expect(dbUser.password).to.equal(user.password);
        });
        it('Should raise an error on missing token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: undefined,
                role: ['user'],
                resetToken: token
            });
            const patchData = {
                password: 'newPassword'
            };
            await helper.client
                .patch('/users/resetPassword')
                .send(patchData)
                .expect(422);
        });
        it('Should raise an error on missing password', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: undefined,
                role: ['user'],
                resetToken: token
            });
            const patchData = {
                token: token
            };
            await helper.client
                .patch('/users/resetPassword')
                .send(patchData)
                .expect(422);
        });
    });

    describe('PATCH /users/validate', () => {
        it('Should validate token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: token,
                role: ['email_not_validated']
            });
            const res = await helper.client
                .patch('/users/validate?token=' + token)
                .send({})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.validationToken).to.be.null();
            expect(dbUser.role).containDeep(['user']);
            expect(dbUser.role).not.containDeep(['email_not_validated']);
        });

        it('Should send 400 on empty token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: token,
                role: ['email_not_validated']
            });
            const res = await helper.client
                .patch('/users/validate?token=')
                .send({})
                .expect(400);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Missing token');
        });
        it('Should send 400 on missing token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: token,
                role: ['email_not_validated']
            });
            const res = await helper.client
                .patch('/users/validate')
                .send({})
                .expect(400);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Missing token');
        });

        it('Should send 404 on invalid token', async () => {
            const token = 'azertyuiopqsdfghjklmwxcv';
            await helper.userRepository.create({
                email: "test2@test.fr",
                password: 'test2',
                validationToken: token,
                role: ['email_not_validated']
            });
            const res = await helper.client
                .patch('/users/validate?token=toto')
                .send({})
                .expect(404);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Token not found');
        });
    });

    describe('GET /users/{id}', () => {
        it("Should send 404 User not found.", async () => {
            const res = await helper.client
                .get('/users/invalidId')
                .set('Authorization', 'Bearer ' + adminToken)
                .send()
                .expect(404);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Entity not found: User with id "invalidId"');
        });

        it("Should send 401 Access denied", async () => {
            await helper.createUser('notadmin@notadmin.fr', 'notadmin', false);
            const currentUserToken = await helper.getJWT('notadmin@notadmin.fr', 'notadmin');
            const res = await helper.client
                .get('/users/' + adminId)
                .set('Authorization', 'Bearer ' + currentUserToken)
                .send()
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Access denied');
        });

        it('Should send 401 not logged in', async () => {
            const res = await helper.client
                .get('/users/' + adminId)
                .send()
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Authorization header not found.');
        });

        it("Success", async () => {
            const res = await helper.client
                .get('/users/' + adminId)
                .set('Authorization', 'Bearer ' + adminToken)
                .send()
                .expect(200);
            const body = res.body;
            expect(body.id).to.equal(JSON.parse(JSON.stringify(adminId)));
            expect(body.email).to.equal(userData.email);
        });
    });

    describe('PATCH /users/{id}', () => {
        let createdUser: User;

        beforeEach(async () => {
            createdUser = await helper.createUser('patcher@patcher.fr', 'patcher', false);
        });

        it("Should send 404 user not found", async () => {
            const res = await helper.client
                .patch('/users/abcdef')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({
                    email: 'test@test.fr'
                })
                .expect(404);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Entity not found: User with id "abcdef"');
        });

        it('Should 409 email already in use', async () => {
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: "test@test.fr", password: "p@22w0rd"})
                .expect(409);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Email already in use');
        });

        it('Should send 400 invalid email', async () => {
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: "testtest.fr", password: "p@22w0rd"})
                .expect(400);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Invalid email.');
        });

        it('Should send 401 Unauthorized (Role is not admin)', async () => {
            await helper.createUser('notadmin@notadmin.fr', 'notadmin', false);
            const currentUserToken = await helper.getJWT('notadmin@notadmin.fr', 'notadmin');
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + currentUserToken)
                .send({email: "test@test.fr", password: "p@22w0rd"})
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Access denied');
        });

        it('Should edit the user password', async () => {
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({password: "p@22w0rd"})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.role).not.containDeep(['email_not_validated']);
            expect(dbUser.role).containDeep(['user']);
        });

        it ('Should send 401 not logged in', async () => {
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .send({role: ['user', 'admin']})
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Authorization header not found.');
        });

        it('Should disable user 2FA', async () => {
            await helper.userRepository.updateById(createdUser.id, {twoFactorAuthenticationEnabled: true});
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({disable2FA: true})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            expect(body.twoFactorAuthenticationEnabled).to.equal(false);
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.twoFactorAuthenticationEnabled).containDeep(false);
        });

        it('Should edit user email', async () => {
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: 'yolo@yolo.fr'})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            expect(body.email).to.equal('yolo@yolo.fr');
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.email).to.equal('yolo@yolo.fr');
            expect(dbUser.role).not.containDeep(['email_not_validated']);
            expect(dbUser.role).containDeep(['user']);
        });

        it('Should edit user roles', async () => {
            const res = await helper.client
                .patch('/users/' + createdUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send({role: ['user', 'admin']})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.role).containDeep(['user', 'admin']);
        });
    });

    describe('PATCH /users/me', () => {
        let createdUser: User;

        beforeEach(async () => {
            createdUser = await helper.createUser('patcher@patcher.fr', 'patcher', false);
        });

        it('Should send 409 email already in use', async () => {
            const res = await helper.client
                .patch('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: createdUser.email, password: "p@22w0rd"})
                .expect(409);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Email already in use');
        });

        it('Should send 400 invalid email', async () => {
            const res = await helper.client
                .patch('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: "testtest.fr", password: "p@22w0rd"})
                .expect(400);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Invalid email.');
        });

        it('Should send 400 missing redirect url', async () => {
            const res = await helper.client
                .patch('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: "moi@moi.fr", password: "p@22w0rd"})
                .expect(400);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Missing redirect URL.');
        });

        it('Should send 401 not allowed to edit your own roles', async () => {
            const res = await helper.client
                .patch('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({role: ['user']})
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('You\'re not authorized to edit your own roles');
        });

        it ('Should send 401 not logged in', async () => {
            const res = await helper.client
                .patch('/users/me?redirectURL=http://localhost:8080')
                .send({email: 'yolo@yolo.fr'})
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Authorization header not found.');
        });

        it('Should edit my password', async () => {
            const res = await helper.client
                .patch('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({password: "p@22w0rd"})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.role).not.containDeep(['email_not_validated']);
            expect(dbUser.role).containDeep(['user', 'admin']);
        });

        it('Should disable 2FA', async () => {
            await helper.userRepository.updateById(createdUser.id, {twoFactorAuthenticationEnabled: true});
            const res = await helper.client
                .patch('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({disable2FA: true})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            expect(body.twoFactorAuthenticationEnabled).to.equal(false);
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.twoFactorAuthenticationEnabled).containDeep(false);
        });

        it('Should edit my email', async () => {
            const res = await helper.client
                .patch('/users/me?redirectURL=http://localhost:8080')
                .set('Authorization', 'Bearer ' + adminToken)
                .send({email: 'yolo@yolo.fr'})
                .expect(200);
            const body = res.body;
            expect(body.id).to.not.empty();
            expect(body.email).to.equal('yolo@yolo.fr');
            const dbUser: User = await helper.userRepository.findById(body.id);
            expect(dbUser.email).to.equal('yolo@yolo.fr');
            expect(dbUser.role).containDeep(['email_not_validated', 'admin']);
            expect(dbUser.role).not.containDeep(['user']);
        });
    });

    describe('GET /users', () => {
        it('Should return all users', async () => {
            const newUser = await helper.createUser('test@admin.fr', 'abcd', false);
            const res = await helper.client
                .get('/users')
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);
            const data = res.body;
            expect(data.length).to.be.eql(2);
            expect(data).containEql({
                id: JSON.parse(JSON.stringify(adminId)),
                email: userData.email,
                role: ['user', 'admin'],
                servicesList: [],
                twoFactorAuthenticationEnabled: false,
                authServices: []
            });
            expect(data).containEql({
                id: JSON.parse(JSON.stringify(newUser.id)),
                email: newUser.email,
                role: newUser.role,
                servicesList: newUser.servicesList,
                twoFactorAuthenticationEnabled: newUser.twoFactorAuthenticationEnabled,
                authServices: newUser.authServices
            });
        });

        it ('Should send 401 not logged in', async () => {
            const res = await helper.client
                .get('/users')
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Authorization header not found.');
        });

        it("Should send 401 Access denied", async () => {
            await helper.createUser('notadmin@notadmin.fr', 'notadmin', false);
            const currentUserToken = await helper.getJWT('notadmin@notadmin.fr', 'notadmin');
            const res = await helper.client
                .get('/users/')
                .set('Authorization', 'Bearer ' + currentUserToken)
                .send()
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Access denied');
        });
    });

    describe('GET /users/me', () => {
        it('Should return my profile', async () => {
            const res = await helper.client
                .get('/users/me')
                .set('Authorization', 'Bearer ' + adminToken)
                .expect(200);
            const body = res.body;
            expect(body.id).to.equal(JSON.parse(JSON.stringify(adminId)));
            expect(body.email).to.equal(userData.email);
            expect(body.role).containDeep(['user', 'admin']);
        });

        it ('Should send 401 not logged in', async () => {
            const res = await helper.client
                .get('/users/me')
                .expect(401);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.equal('Authorization header not found.');
        });
    });

    describe('DEL /users/{id}', () => {
        it('Should delete the user', async () => {
            const newUser = await helper.createUser('test@b12.com', 'abcde');

            const startCount = (await helper.userRepository.count()).count;

            await helper.client
                .del('/users/' + newUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send()
                .expect(200);

            const usersCount = (await helper.userRepository.count()).count;
            expect(usersCount).to.be.eql(startCount - 1);

            const userWithIdCount = (await helper.userRepository.count({id: newUser.id})).count;
            expect(userWithIdCount).to.be.eql(0);
        });

        it('Should delete areas belonging to the user', async () => {
            const newUser = await helper.createUser('test@b12.com', 'abcde');
            const area = await helper.createArea(newUser, "Test AREA");

            expect((await helper.userRepository.count({id: newUser.id})).count).to.be.equal(1);
            expect((await helper.areaRepository.count({id: area.id})).count).to.be.equal(1);
            await helper.client
                .del('/users/' + newUser.id)
                .set('Authorization', 'Bearer ' + adminToken)
                .send()
                .expect(200);
            expect((await helper.userRepository.count({id: newUser.id})).count).to.be.equal(0);
            expect((await helper.areaRepository.count({id: area.id})).count).to.be.equal(0);
        });

        it('Should delete areas belonging to the user even when using deleteAll', async () => {
            const newUser = await helper.createUser('test@b12.com', 'abcde');
            const area = await helper.createArea(newUser, "Test AREA");

            expect((await helper.userRepository.count({id: newUser.id})).count).to.be.equal(1);
            expect((await helper.areaRepository.count({id: area.id})).count).to.be.equal(1);
            await helper.userRepository.deleteAll();
            expect((await helper.userRepository.count({id: newUser.id})).count).to.be.equal(0);
            expect((await helper.areaRepository.count({id: area.id})).count).to.be.equal(0);
        });

        it("Should send 404 user not found", async () => {
            const startCount = (await helper.userRepository.count()).count;

            const res = await helper.client
                .del('/users/test')
                .set('Authorization', 'Bearer ' + adminToken)
                .send()
                .expect(404);

            const usersCount = (await helper.userRepository.count()).count;
            expect(usersCount).to.be.eql(startCount);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.be.eql('Entity not found: User with id "test"');
        });

        it ('Should send 401 not logged in', async () => {
            const newUser = await helper.createUser('test@b12.com', 'abcde');

            const startCount = (await helper.userRepository.count()).count;

            const res = await helper.client
                .del('/users/' + newUser.id)
                .send()
                .expect(401);

            const usersCount = (await helper.userRepository.count()).count;
            expect(usersCount).to.be.eql(startCount);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.be.eql('Authorization header not found.');
        });

        it ('Should send 401 access denied', async () => {
            const newUser = await helper.createUser('test@b12.com', 'abcde');
            const token = await helper.getJWT(newUser.email, 'abcde');


            const startCount = (await helper.userRepository.count()).count;

            const res = await helper.client
                .del('/users/' + newUser.id)
                .set('Authorization', 'Bearer ' + token)
                .send()
                .expect(401);

            const usersCount = (await helper.userRepository.count()).count;
            expect(usersCount).to.be.eql(startCount);
            const error = JSON.parse(res.error.text);
            expect(error.error.message).to.be.eql('Access denied');
        });
    });
});