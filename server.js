const express = require('express')
const Handlebars = require('handlebars')
const expressHandlebars = require('express-handlebars')
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const { response } = require('express')
const app = express()
const {Board,Task,User,sequelize} = require("./models")

const handlebars = expressHandlebars({
    handlebars: allowInsecurePrototypeAccess(Handlebars)
})

app.use(express.static('public'))
app.engine('handlebars', handlebars)
app.set('view engine', 'handlebars')
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
async function sync() {
 await sequelize.sync()
}
sync()
app.listen(3000, () => console.log('web server running on port 3000'))

//---------rendering create User page ------

app.get('/users/create',(req,res)=>{
    res.render('createUser')
})

//------rendering create board page-----
app.get('/boards/create',(req,res)=>{
    res.render('createBoard')
})


//--------create board ------

app.post('/boards/create',async (req,res)=>{
    console.log('creating board')
    const board = await Board.create({name:req.body.name,description:req.body.description,})
    res.redirect(`/boards/${board.id}`)
})


//--------create user ------

app.post('/users/create',async (req,res)=>{
    console.log('creating user')
    const user = await User.create({username:req.body.username,avatar:req.body.avatar})
    res.redirect(`/users/${user.id}`)
})

//-----rendering home page-----

app.get('/',async (req,res)=>{
    const boards = await Board.findAll({
        include: [{model:User}],
        nest: true
    })
    const users = await User.findAll()
    res.render('home',{boards,users})
})

//-----find user from homepage----
app.post('/finduser', async (req,res)=>{
    console.log(req.body)
    users = await User.findAll({where:{username:req.body.username}})
    user = users[0]
    res.redirect(`/users/${user.id}`)
})

//------rendering board-----

app.get('/boards/:boardid',async (req,res)=>{
    const board = await Board.findByPk(req.params.boardid)
    const users = await User.findAll()
    const inProgress = await board.getTasks({where:{status:'in progress'},include:[{model:User}]})
    const done = await board.getTasks({where:{status:'done'},include:[{model:User}]})
    const toDo = await board.getTasks({where:{status:'to do'},include:[{model:User}]})
    res.render('board',{board,inProgress,done,toDo,users})
})

//----create task -----

app.post('/boards/:boardid/tasks/create',async (req,res) =>{
    const task = await Task.create({taskName:req.body.taskName,taskDescription:req.body.taskDescription,status:req.body.status,priority:req.body.priority,deadline:req.body.deadline})
    const board = await Board.findByPk(req.params.boardid)
    await board.addTask(task)
    user = await User.findAll({where:{username:`${req.body.assignee}`}})
    console.log(user)
    if(user[0]){
        await user[0].addTask(task)
    }
    res.redirect(`/boards/${req.params.boardid}`)
})

//----edit board------

app.post('/boards/:boardid/edit',async (req,res) =>{
    const board = await Board.findByPk(req.params.boardid)
    await board.update({name:req.body.name,description:req.body.description})
    res.redirect('/')
})

//----update task-----

app.post('/boards/:boardid/tasks/:taskid/update',async (req,res)=>{
    const task = await Task.findByPk(req.params.taskid)
    await task.update({taskName:req.body.taskName,taskDescription:req.body.taskDescription,status:req.body.status,priority:req.body.priority,deadline:req.body.deadline})
    res.redirect(`/boards/${req.params.boardid}`)
})

//-----edit user-------

app.post('/users/:userid/edit',async (req,res) =>{
    const user = await User.findByPk(req.params.userid)
    await user.update({username:req.body.username,avatar:req.body.avatar})
    res.redirect(`/boards/${req.params.boardid}`)
})

//-----destroy user ----

app.get('/user/:userid/delete', async (req,res)=>{
    await Task.findByPk(req.params.userid).then(user =>{
        user.destroy()
    })
    res.redirect('/')
})

//-----destroy task ----
app.get('/boards/:boardid/tasks/:taskid/delete', async (req,res)=>{
    await Task.findByPk(req.params.taskid).then(task =>{
        task.destroy()
    })
    res.redirect(`/boards/${req.params.boardid}`)
})

//-----destroy board ----

app.get('/boards/:boardid/delete', async (req,res)=>{
    const board = await Board.findByPk(req.params.boardid)
    await board.destroy()
    res.redirect('/')
})


//-----fetch requests for board-----
app.get('/boards/:boardid/tasks/done',async (req,res)=>{
    const done =await Task.findAll({
        where:{BoardId:req.params.boardid,
            status:"done"}});
    res.send(done)
})
app.get('/boards/:boardid/tasks/todo',async (req,res)=>{
    const todo = await Task.findAll({
        where:{
            BoardId:req.params.boardid,
            status:"to do"}});
    res.send(todo)
})
app.get('/boards/:boardid/tasks/doing',async (req,res)=>{
    const doing = await Task.findAll({
        where:{
            BoardId:req.params.boardid,
            status:"in progress"}});
    res.send(doing)
})

//-----changing status of tasks from board-------

app.post('/tasks/:taskid/update',async(req,res)=>{
    const task = await Task.findByPk(req.params.taskid)
    console.log(req.body)
    const status = req.body.status
    console.log(status)
    await task.update({status:status})
    res.send()
})

//---destroying task from board-----

app.post('/tasks/:taskid/delete',async(req,res)=>{
    const task = await Task.findByPk(req.params.taskid)
    await task.destroy()
    res.send()
})
